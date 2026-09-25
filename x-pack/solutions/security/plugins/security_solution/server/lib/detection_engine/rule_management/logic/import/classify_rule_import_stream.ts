/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'events';
import type { Readable } from 'stream';
import { Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { constants, createZstdCompress } from 'zlib';
import { createSplitStream } from '@kbn/utils';
import type { SavedObject } from '@kbn/core/server';
import type {
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { classifyImportItem, stripOriginIdValue } from './create_rules_stream_from_ndjson';

export interface IndexedParseError {
  index: number;
  error: Error;
}

export interface ClassifiedRuleImport {
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  actionConnectors: SavedObject[];
  parseErrors: IndexedParseError[];
  rulesZstd: Buffer;
  ruleCount: number;
  lastRuleIndexById: Map<string, number>;
  extraRuleIds: string[];
}

const parseLine = (line: string): unknown | Error => {
  try {
    return JSON.parse(line);
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
};

const writeLine = async (compress: ReturnType<typeof createZstdCompress>, line: string) => {
  if (!compress.write(`${line}\n`)) {
    await once(compress, 'drain');
  }
};

export const classifyRuleImportStream = async ({
  objectLimit,
  stream,
}: {
  objectLimit: number;
  stream: Readable;
}): Promise<ClassifiedRuleImport> => {
  const exceptions: ClassifiedRuleImport['exceptions'] = [];
  const actionConnectors: SavedObject[] = [];
  const parseErrors: IndexedParseError[] = [];
  const lastRuleIndexById = new Map<string, number>();
  const extraRuleIds: string[] = [];
  const chunks: Buffer[] = [];

  const compress = createZstdCompress({
    params: { [constants.ZSTD_c_compressionLevel]: 3 },
  });
  const collect = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk as Buffer);
      cb();
    },
  });
  const collected = pipeline(compress, collect);

  let ruleCount = 0;
  let zstdIndex = 0;
  const split = createSplitStream('\n');
  stream.pipe(split);

  try {
    for await (const line of split) {
      if (typeof line !== 'string' || line.trim() === '') {
        continue;
      }

      const parsed = parseLine(line);
      if (parsed instanceof Error) {
        if (ruleCount >= objectLimit) {
          throw new Error(`Can't import more than ${objectLimit} rules`);
        }
        parseErrors.push({ index: ruleCount, error: parsed });
        ruleCount++;
        continue;
      }

      const kind = classifyImportItem(parsed);
      if (kind === 'export_details') {
        continue;
      }
      if (kind === 'exception') {
        exceptions.push(parsed as ImportExceptionsListSchema | ImportExceptionListItemSchema);
        continue;
      }
      if (kind === 'connector') {
        actionConnectors.push(stripOriginIdValue(parsed) as SavedObject);
        continue;
      }

      if (ruleCount >= objectLimit) {
        throw new Error(`Can't import more than ${objectLimit} rules`);
      }

      if (
        parsed != null &&
        typeof parsed === 'object' &&
        'rule_id' in parsed &&
        typeof parsed.rule_id === 'string'
      ) {
        if (lastRuleIndexById.has(parsed.rule_id)) {
          extraRuleIds.push(parsed.rule_id);
        }
        lastRuleIndexById.set(parsed.rule_id, zstdIndex);
      }

      await writeLine(compress, line);
      zstdIndex++;
      ruleCount++;
    }
    compress.end();
    await collected;
  } catch (err) {
    compress.destroy();
    split.destroy();
    if (!stream.destroyed) {
      stream.destroy();
    }
    await collected.catch(() => undefined);
    throw err;
  }

  return {
    exceptions,
    actionConnectors,
    parseErrors,
    rulesZstd: Buffer.concat(chunks),
    ruleCount,
    lastRuleIndexById,
    extraRuleIds,
  };
};

export const mergeIndexedErrors = <T>(
  items: T[],
  indexedErrors: IndexedParseError[]
): Array<T | Error> => {
  if (indexedErrors.length === 0) {
    return items;
  }

  const byIndex = new Map(indexedErrors.map(({ index, error }) => [index, error]));
  const total = items.length + indexedErrors.length;
  const merged: Array<T | Error> = [];
  let itemOffset = 0;

  for (let i = 0; i < total; i++) {
    const error = byIndex.get(i);
    if (error) {
      merged.push(error);
    } else {
      merged.push(items[itemOffset++]);
    }
  }

  return merged;
};
