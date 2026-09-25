/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import type { Transform } from 'stream';
import {
  createSplitStream,
  createMapStream,
  createConcatStream,
  createReduceStream,
} from '@kbn/utils';

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type {
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import type { RuleToImportInput } from '../../../../../../common/api/detection_engine/rule_management';
import {
  RuleToImport,
  validateRuleToImport,
} from '../../../../../../common/api/detection_engine/rule_management';
import type { RulesObjectsExportResultDetails } from '../../../../../utils/read_stream/create_stream_from_ndjson';
import {
  parseNdjsonStrings,
  createRulesLimitStream,
  filterExportedCounts,
} from '../../../../../utils/read_stream/create_stream_from_ndjson';

/**
 * Validates exception lists and items schemas
 */
export const validateRulesStream = (): Transform => {
  return createMapStream<{
    exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema | Error>;
    rules: Array<RuleToImportInput | Error>;
    actionConnectors: SavedObject[];
  }>((items) => ({
    actionConnectors: items.actionConnectors,
    exceptions: items.exceptions,
    rules: validateRules(items.rules),
  }));
};

export const validateRules = (
  rules: Array<RuleToImportInput | Error>
): Array<RuleToImport | Error> => {
  return rules.map((obj: RuleToImportInput | Error) => {
    if (obj instanceof Error) {
      return obj;
    }

    const result = RuleToImport.safeParse({
      ...obj,
      // Ignore the rule source field for now. A proper handling of this field
      // will be added as part of https://github.com/elastic/kibana/issues/180168
      rule_source: undefined,
    });
    if (!result.success) {
      return new BadRequestError(stringifyZodError(result.error));
    }

    const validationErrors = validateRuleToImport(result.data);
    if (validationErrors.length) {
      return new BadRequestError(validationErrors.join());
    }

    return result.data;
  });
};

export type ImportItemKind = 'exception' | 'connector' | 'export_details' | 'rule';

export const classifyImportItem = (importItem: unknown): ImportItemKind => {
  if (importItem != null && typeof importItem === 'object' && has('exported_count', importItem)) {
    return 'export_details';
  }
  if (has('list_id', importItem) || has('item_id', importItem) || has('entries', importItem)) {
    return 'exception';
  }
  if (has('attributes', importItem)) {
    return 'connector';
  }
  return 'rule';
};

/**
 * Sorts the exceptions into the lists and items.
 * We do this because we don't want the order of the exceptions
 * in the import to matter. If we didn't sort, then some items
 * might error if the list has not yet been created
 */
export const sortImports = (): Transform => {
  return createReduceStream<{
    exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema | Error>;
    rules: Array<RuleToImportInput | Error>;
    actionConnectors: SavedObject[];
  }>(
    (acc, importItem) => {
      const kind = classifyImportItem(importItem);
      if (kind === 'exception') {
        return { ...acc, exceptions: [...acc.exceptions, importItem] };
      }
      if (kind === 'connector') {
        return { ...acc, actionConnectors: [...acc.actionConnectors, importItem] };
      }
      if (kind === 'export_details') {
        return acc;
      }
      return { ...acc, rules: [...acc.rules, importItem] };
    },
    {
      exceptions: [],
      rules: [],
      actionConnectors: [],
    }
  );
};

export const migrateInvestigationFieldsValue = <T>(obj: T): T => {
  if (obj != null && typeof obj === 'object' && 'investigation_fields' in obj) {
    const fields = (obj as { investigation_fields?: unknown }).investigation_fields;
    if (Array.isArray(fields)) {
      if (fields.length) {
        return {
          ...obj,
          investigation_fields: {
            field_names: fields,
          },
        };
      }
      const { investigation_fields: _, ...rest } = obj as T & { investigation_fields: unknown };
      return rest as T;
    }
  }
  return obj;
};

export const stripOriginIdValue = <T>(obj: T): T => {
  if (obj != null && typeof obj === 'object' && 'originId' in obj) {
    const { originId: _, ...rest } = obj as T & { originId: unknown };
    return rest as T;
  }
  return obj;
};

export const migrateLegacyInvestigationFields = (): Transform => {
  return createMapStream<RuleToImportInput | RulesObjectsExportResultDetails>((obj) =>
    migrateInvestigationFieldsValue(obj)
  );
};

export const stripActionConnectorOriginIds = (): Transform => {
  return createMapStream((obj) => stripOriginIdValue(obj));
};

// TODO: Capture both the line number and the rule_id if you have that information for the error message
// eventually and then pass it down so we can give error messages on the line number

export const createRulesAndExceptionsStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedCounts(),
    migrateLegacyInvestigationFields(),
    stripActionConnectorOriginIds(),
    sortImports(),
    validateRulesStream(),
    createRulesLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};
