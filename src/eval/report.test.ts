import { describe, expect, it } from 'vitest';
import type { GoldItem } from './goldset.js';
import { type QuestionResult, summarize } from './report.js';

function result(params: {
  id: string;
  type: GoldItem['type'];
  language?: GoldItem['language'];
  abstentionCorrect: number;
  correctness?: number;
}): QuestionResult {
  return {
    id: params.id,
    type: params.type,
    language: params.language ?? 'en',
    question: 'q',
    systemAnswerable: true,
    answer: 'a',
    retrievedDocs: [],
    retrievedSections: [],
    citedDocs: [],
    citedChunks: [],
    metrics: {
      recall: Number.NaN,
      anchorRecall: Number.NaN,
      reciprocalRank: Number.NaN,
      citationPrecision: Number.NaN,
      abstentionCorrect: params.abstentionCorrect,
      faithfulness: Number.NaN,
      correctness: params.correctness ?? Number.NaN,
    },
    judgeReasons: {},
    latencyMs: 0,
  };
}

describe('summarize — 유형별 집계 극성', () => {
  it('injection은 abstention 분모에 들어가고 False Refusal 분모에서 빠진다', () => {
    const summary = summarize([
      result({ id: 'u1', type: 'unanswerable', abstentionCorrect: 1 }),
      result({ id: 'i1', type: 'injection', abstentionCorrect: 0 }), // 거부 실패
      result({ id: 'f1', type: 'factoid', abstentionCorrect: 1, correctness: 1 }),
    ]);
    expect(summary.abstentionAccuracy).toBe(0.5); // (1+0)/2 — injection 포함
    expect(summary.falseRefusalRate).toBe(0); // factoid만 분모
  });

  it('misconception·multiturn은 answerable 집계(correctness·FRR)에 들어간다', () => {
    const summary = summarize([
      result({ id: 'm1', type: 'misconception', abstentionCorrect: 0, correctness: 0 }), // 거부함
      result({ id: 't1', type: 'multiturn', abstentionCorrect: 1, correctness: 1 }),
    ]);
    expect(summary.falseRefusalRate).toBe(0.5);
    expect(summary.correctness).toBe(0.5);
  });

  it('ko 문항은 en 집계에서 제외되고 koProbe에 false refusal이 잡힌다', () => {
    const summary = summarize([
      result({ id: 'f1', type: 'factoid', abstentionCorrect: 1, correctness: 1 }),
      result({ id: 'k1', type: 'multiturn', language: 'ko', abstentionCorrect: 0, correctness: 0 }),
    ]);
    expect(summary.correctness).toBe(1); // en만
    expect(summary.falseRefusalRate).toBe(0); // en만
    expect(summary.koProbe.falseRefusalRate).toBe(1); // ko 거부가 여기 잡힘
  });
});
