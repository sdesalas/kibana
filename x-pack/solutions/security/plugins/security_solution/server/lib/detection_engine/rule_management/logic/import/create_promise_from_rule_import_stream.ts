/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type { SavedObject } from '@kbn/core/server';
import type {
  ImportExceptionsListSchema,
  ImportExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  classifyRuleImportStream,
  mergeIndexedErrors,
} from './classify_rule_import_stream';
import { inflateRuleImportBatches } from './inflate_rule_import_batches';
import type { RuleFromImportStream } from './utils';

export interface RuleImportStreamResult {
  rules: RuleFromImportStream[];
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  actionConnectors: SavedObject[];
}

/**
 * Utility for generating a promise from a Readable stream corresponding to an
 * NDJSON file. Used during rule import.
 */
export const createPromiseFromRuleImportStream = async ({
  objectLimit,
  stream,
}: {
  objectLimit: number;
  stream: Readable;
}): Promise<RuleImportStreamResult[]> => {
  const classified = await classifyRuleImportStream({ objectLimit, stream });
  const inflated: RuleFromImportStream[] = [];

  for await (const { items } of inflateRuleImportBatches(
    classified.rulesZstd,
    Number.MAX_SAFE_INTEGER
  )) {
    inflated.push(...items);
  }

  return [
    {
      exceptions: classified.exceptions,
      actionConnectors: classified.actionConnectors,
      rules: mergeIndexedErrors(inflated, classified.parseErrors),
    },
  ];
};
