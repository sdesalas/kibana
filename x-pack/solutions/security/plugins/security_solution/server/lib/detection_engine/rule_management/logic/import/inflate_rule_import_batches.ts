/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { createZstdDecompress } from 'zlib';
import { createSplitStream } from '@kbn/utils';
import type { RuleToImportInput } from '../../../../../../common/api/detection_engine/rule_management';
import type { RuleFromImportStream } from './utils';
import {
  migrateInvestigationFieldsValue,
  stripOriginIdValue,
  validateRules,
} from './create_rules_stream_from_ndjson';

export interface InflatedRuleBatch {
  items: RuleFromImportStream[];
  startIndex: number;
}

const parseRuleLine = (line: string): RuleFromImportStream => {
  try {
    const parsed = JSON.parse(line);
    const prepared = stripOriginIdValue(migrateInvestigationFieldsValue(parsed));
    return validateRules([prepared as RuleToImportInput])[0];
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
};

async function* decodeZstdLines(rulesZstd: Buffer): AsyncGenerator<string> {
  if (rulesZstd.length === 0) {
    return;
  }

  const source = Readable.from([rulesZstd]);
  const decompress = createZstdDecompress();
  const split = createSplitStream('\n');
  source.pipe(decompress).pipe(split);

  try {
    for await (const line of split) {
      if (typeof line === 'string' && line.trim() !== '') {
        yield line;
      }
    }
  } catch (err) {
    source.destroy();
    decompress.destroy();
    split.destroy();
    throw err;
  }
}

export async function* inflateRuleImportBatches(
  rulesZstd: Buffer,
  batchSize: number
): AsyncGenerator<InflatedRuleBatch> {
  let items: RuleFromImportStream[] = [];
  let startIndex = 0;
  let index = 0;

  for await (const line of decodeZstdLines(rulesZstd)) {
    items.push(parseRuleLine(line));
    index++;
    if (items.length === batchSize) {
      yield { items, startIndex };
      startIndex = index;
      items = [];
    }
  }

  if (items.length > 0) {
    yield { items, startIndex };
  }
}
