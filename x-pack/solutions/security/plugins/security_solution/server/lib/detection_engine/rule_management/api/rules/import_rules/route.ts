/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { partition } from 'lodash/fp';
import { extname } from 'path';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { validateRuleImportResponseActions } from '../../../../../../endpoint/services';
import {
  ImportRulesRequestQuery,
  ImportRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_IMPORT_URL } from '../../../../../../../common/constants';
import type { ConfigType } from '../../../../../../config';
import type { HapiReadableStream, SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse, createBulkErrorObject } from '../../../../routes/utils';
import type { BulkError } from '../../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { importRuleActionConnectors } from '../../../logic/import/action_connectors/import_rule_action_connectors';
import { validateRuleActions } from '../../../logic/import/action_connectors/validate_rule_actions';
import type {
  ImportRuleError,
  ImportRuleSuccess,
} from '../../../logic/detection_rules_client/detection_rules_client_interface';

import { classifyRuleImportStream } from '../../../logic/import/classify_rule_import_stream';
import { inflateRuleImportBatches } from '../../../logic/import/inflate_rule_import_batches';
import { importRuleExceptions } from '../../../logic/import/import_rule_exceptions';
import { isRuleToImport } from '../../../logic/import/utils';
import {
  getTupleDuplicateErrorsAndUniqueRules,
  migrateLegacyActionsIds,
} from '../../../utils/utils';
import {
  RULE_IMPORT_BATCH_SIZE,
  RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS,
} from '../../constants';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { ensureLatestRulesPackageInstalled } from '../../../../prebuilt_rules/logic/integrations/ensure_latest_rules_package_installed';

export const importRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_IMPORT_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
        },
      },
      options: {
        body: {
          maxBytes: config.maxRuleImportPayloadBytes,
          output: 'stream',
        },
        timeout: {
          idleSocket: RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidationWithZod(ImportRulesRequestQuery),
            body: schema.any(), // validation on file object is accomplished later in the handler.
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ImportRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve([
            'core',
            'securitySolution',
            'actions',
            'lists',
            'licensing',
          ]);

          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
          const actionsClient = ctx.actions.getActionsClient();
          const actionSOClient = ctx.core.savedObjects.getClient({
            includedHiddenTypes: ['action'],
          });
          const actionsImporter = ctx.core.savedObjects.getImporter(actionSOClient);

          const savedObjectsClient = ctx.core.savedObjects.client;
          const exceptionsClient = ctx.lists?.getExceptionListClient();
          const endpointAuthz = await ctx.securitySolution.getEndpointAuthz();
          const endpointService = ctx.securitySolution.getEndpointService();
          const spaceId = ctx.securitySolution.getSpaceId();

          const file = request.body?.file as HapiReadableStream | undefined;
          if (!file) {
            return siemResponse.error({
              statusCode: 400,
              body: 'file is required',
            });
          }

          const { filename } = file.hapi;
          const fileExtension = extname(filename).toLowerCase();
          if (fileExtension !== '.ndjson') {
            return siemResponse.error({
              statusCode: 400,
              body: `Invalid file extension ${fileExtension}`,
            });
          }

          const objectLimit = config.maxRuleImportExportSize;

          const {
            exceptions,
            actionConnectors,
            parseErrors: streamParseErrors,
            rulesZstd,
            ruleCount,
            lastRuleIndexById,
            extraRuleIds,
          } = await classifyRuleImportStream({ stream: file, objectLimit });

          // import exceptions, includes validation
          const {
            errors: exceptionsErrors,
            successCount: exceptionsSuccessCount,
            success: exceptionsSuccess,
          } = await importRuleExceptions({
            exceptions,
            exceptionsClient,
            overwrite: request.query.overwrite_exceptions,
            maxExceptionsImportSize: objectLimit,
          });

          // import actions-connectors
          const {
            successCount: actionConnectorSuccessCount,
            success: actionConnectorSuccess,
            warnings: actionConnectorWarnings,
            errors: actionConnectorErrors,
          } = await importRuleActionConnectors({
            actionConnectors,
            actionsImporter,
            overwrite: request.query.overwrite_action_connectors,
          });

          // Ensure the prebuilt rules package is installed once per request so
          // the import path can look up prebuilt assets during rule_source calc.
          await ensureLatestRulesPackageInstalled(
            createPrebuiltRuleAssetsClient(savedObjectsClient),
            ctx.securitySolution,
            logger
          );

          const successes: ImportRuleSuccess[] = [];
          const importErrors: ImportRuleError[] = [];
          const parseErrors: BulkError[] = streamParseErrors.map(({ error }) =>
            createBulkErrorObject({
              statusCode: 400,
              message: error.message,
            })
          );
          const duplicateIdErrors: BulkError[] = request.query.overwrite
            ? []
            : extraRuleIds.map((ruleId) =>
                createBulkErrorObject({
                  ruleId,
                  statusCode: 400,
                  message: `More than one rule with rule-id: "${ruleId}" found`,
                })
              );
          const missingActionErrors: BulkError[] = [];
          const responseActionsErrors: BulkError[] = [];
          const bulkCount = lastRuleIndexById.size;

          for await (const { items, startIndex } of inflateRuleImportBatches(
            rulesZstd,
            RULE_IMPORT_BATCH_SIZE
          )) {
            const lastWins = items.filter((item, i) => {
              if (!isRuleToImport(item) || item.rule_id == null) {
                return true;
              }
              const last = lastRuleIndexById.get(item.rule_id);
              return last === undefined || last === startIndex + i;
            });

            const [batchDuplicateErrors, rulesToImportOrErrors] =
              getTupleDuplicateErrorsAndUniqueRules(lastWins, request.query.overwrite);
            duplicateIdErrors.push(...batchDuplicateErrors);

            const migratedRulesToImportOrErrors = await migrateLegacyActionsIds(
              rulesToImportOrErrors,
              actionSOClient,
              actionsClient
            );

            const [parsedRules, parsedRuleErrors] = partition(
              isRuleToImport,
              migratedRulesToImportOrErrors
            );

            parseErrors.push(
              ...parsedRuleErrors.map((error) =>
                createBulkErrorObject({
                  statusCode: 400,
                  message: error.message,
                })
              )
            );

            const { validatedActionRules, missingActionErrors: batchMissing } =
              await validateRuleActions({
                actionsClient,
                rules: parsedRules,
              });
            missingActionErrors.push(...batchMissing);

            const { valid, errors: batchResponseActions } = await validateRuleImportResponseActions({
              endpointAuthz,
              endpointService,
              spaceId,
              rulesToImport: validatedActionRules,
              checkOsqueryResponseActionAuthz:
                ctx.securitySolution.getCheckOsqueryResponseActionAuthz(),
            });
            responseActionsErrors.push(...batchResponseActions);

            if (valid.length === 0) {
              continue;
            }

            const result = await detectionRulesClient.importRules({
              rules: valid,
              changeTracking: {
                action: SecurityRuleChangeTrackingAction.ruleImport,
                metadata: { bulkCount },
              },
              overwriteRules: request.query.overwrite,
              allowMissingConnectorSecrets: !!actionConnectors.length,
              batchSize: RULE_IMPORT_BATCH_SIZE,
            });
            successes.push(...result.successes);
            importErrors.push(...result.errors);
          }

          const errors = [
            ...parseErrors,
            ...duplicateIdErrors,
            ...importErrors.map(toErrorResponse),
            ...missingActionErrors,
            ...responseActionsErrors,
          ];

          const importRulesResponse: ImportRulesResponse = {
            success: errors.length === 0,
            success_count: successes.length,
            rules_count: ruleCount,
            errors,
            exceptions_errors: exceptionsErrors,
            exceptions_success: exceptionsSuccess,
            exceptions_success_count: exceptionsSuccessCount,
            action_connectors_success: actionConnectorSuccess,
            action_connectors_success_count: actionConnectorSuccessCount,
            action_connectors_errors: actionConnectorErrors,
            action_connectors_warnings: actionConnectorWarnings,
          };

          return response.ok({ body: ImportRulesResponse.parse(importRulesResponse) });
        } catch (err) {
          logger.error(`importRulesRoute: Caught error: ${err.message}`, err);
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};

const toErrorResponse = (item: ImportRuleError) => {
  const { ruleId, message, type } = item.error;

  return createBulkErrorObject({
    message,
    statusCode: type === 'conflict' ? 409 : 400,
    ruleId,
  });
};
