/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { classifyRuleImportStream } from './classify_rule_import_stream';
import { inflateRuleImportBatches } from './inflate_rule_import_batches';

const sample = {
  rule_id: 'rule-1',
  output_index: '.siem-signals',
  risk_score: 50,
  max_signals: 100,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  index: ['index-1'],
  name: 'some-name',
  severity: 'low',
  interval: '5m',
  type: 'query',
};

const asNdjson = (value: Record<string, unknown>): string => `${JSON.stringify(value)}\n`;

describe('classifyRuleImportStream', () => {
  test('spills rules to zstd and keeps last-wins indexes', async () => {
    const first = { ...sample, name: 'first' };
    const second = { ...sample, name: 'second' };
    const stream = new Readable({
      read() {
        this.push(asNdjson(first));
        this.push(asNdjson(second));
        this.push(null);
      },
    });

    const classified = await classifyRuleImportStream({ stream, objectLimit: 1000 });

    expect(classified.ruleCount).toEqual(2);
    expect(classified.extraRuleIds).toEqual(['rule-1']);
    expect(classified.lastRuleIndexById.get('rule-1')).toEqual(1);
    expect(classified.rulesZstd.length).toBeGreaterThan(0);

    const batches = [];
    for await (const batch of inflateRuleImportBatches(classified.rulesZstd, 1)) {
      batches.push(batch);
    }

    expect(batches).toHaveLength(2);
    expect(batches[0].startIndex).toEqual(0);
    expect(batches[1].startIndex).toEqual(1);
    expect(batches[0].items[0]).toEqual(expect.objectContaining({ name: 'first' }));
    expect(batches[1].items[0]).toEqual(expect.objectContaining({ name: 'second' }));
  });

  test('does not keep parsed rules after classify', async () => {
    const stream = new Readable({
      read() {
        this.push(asNdjson(sample));
        this.push(null);
      },
    });

    const classified = await classifyRuleImportStream({ stream, objectLimit: 1000 });

    expect(classified).not.toHaveProperty('rules');
    expect(Buffer.isBuffer(classified.rulesZstd)).toEqual(true);
  });
});
