import { describe, expect, it } from 'vitest';
import type { Summary } from './report.js';
import { checkGates, METRIC_TARGETS } from './targets.js';

function summaryWith(overrides: Partial<Summary>): Summary {
  // 모든 gate를 통과하는 기준값
  return {
    recallAtK: 1,
    anchorRecallAtK: 0.9,
    mrr: 0.9,
    citationPrecision: 0.96,
    abstentionAccuracy: 1,
    falseRefusalRate: 0,
    faithfulness: 1,
    correctness: 0.95,
    byType: {},
    koProbe: {
      count: 0,
      correctness: Number.NaN,
      abstentionAccuracy: Number.NaN,
      falseRefusalRate: Number.NaN,
    },
    ...overrides,
  };
}

describe('checkGates', () => {
  it('모든 gate를 통과하면 위반이 없다', () => {
    expect(checkGates(summaryWith({}))).toEqual([]);
  });

  it('min 방향 metric이 gate 미만이면 위반이다', () => {
    const violations = checkGates(summaryWith({ correctness: 0.5 }));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.label).toBe('Correctness');
  });

  it('max 방향 metric이 gate 초과면 위반이다 (과잉 거부 감지)', () => {
    const violations = checkGates(summaryWith({ falseRefusalRate: 0.3 }));
    expect(violations.map((v) => v.label)).toEqual(['False Refusal Rate']);
  });

  it('경계값은 통과다 (gate 이상/이하)', () => {
    expect(checkGates(summaryWith({ correctness: 0.85, falseRefusalRate: 0.1 }))).toEqual([]);
  });

  it('NaN metric은 판정에서 제외한다', () => {
    expect(checkGates(summaryWith({ anchorRecallAtK: Number.NaN }))).toEqual([]);
  });

  it('모든 target 정의는 gate보다 엄격하다 (정의 자체의 정합성)', () => {
    for (const t of METRIC_TARGETS) {
      if (t.direction === 'min') expect(t.target).toBeGreaterThanOrEqual(t.gate);
      else expect(t.target).toBeLessThanOrEqual(t.gate);
    }
  });
});
