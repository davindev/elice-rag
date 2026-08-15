import { describe, expect, it } from 'vitest';
import type { Citation } from '../rag/pipeline.js';
import { anchorRecallAtK, citationPrecision, mean, recallAtK, reciprocalRank } from './metrics.js';

function citation(docPath: string): Citation {
  return { index: 1, chunkId: 'x', docPath, headingPath: [], url: '', score: 0 };
}

describe('recallAtK', () => {
  it('기대 문서가 모두 검색되면 1', () => {
    expect(recallAtK(['a.md', 'b.md'], ['b.md', 'c.md', 'a.md'])).toBe(1);
  });
  it('일부만 검색되면 비율을 반환한다', () => {
    expect(recallAtK(['a.md', 'b.md'], ['a.md', 'c.md'])).toBe(0.5);
  });
  it('기대 문서가 없으면(unanswerable) NaN', () => {
    expect(recallAtK([], ['a.md'])).toBeNaN();
  });
});

describe('reciprocalRank', () => {
  it('첫 문서가 정답이면 1', () => {
    expect(reciprocalRank(['a.md'], ['a.md', 'b.md'])).toBe(1);
  });
  it('중복 문서를 제거한 문서 순위로 계산한다', () => {
    // 청크 단위 결과 [b, b, a] → 문서 순위 [b, a] → a는 2위
    expect(reciprocalRank(['a.md'], ['b.md', 'b.md', 'a.md'])).toBe(0.5);
  });
  it('정답 문서가 없으면 0', () => {
    expect(reciprocalRank(['a.md'], ['b.md', 'c.md'])).toBe(0);
  });
});

describe('citationPrecision', () => {
  it('인용한 문서가 모두 기대 근거면 1', () => {
    expect(citationPrecision(['a.md'], [citation('a.md'), citation('a.md')])).toBe(1);
  });
  it('기대 밖 문서를 인용하면 비율이 떨어진다', () => {
    expect(citationPrecision(['a.md'], [citation('a.md'), citation('b.md')])).toBe(0.5);
  });
  it('인용이 없으면 NaN', () => {
    expect(citationPrecision(['a.md'], [])).toBeNaN();
  });
});

describe('anchorRecallAtK', () => {
  const retrieved = [
    { docPath: 'a.md', anchors: ['s1', 's2'] },
    { docPath: 'b.md', anchors: ['s1'] },
  ];
  it('문서와 앵커가 모두 일치해야 hit으로 센다', () => {
    expect(anchorRecallAtK([{ doc: 'a.md', anchor: 's2' }], retrieved)).toBe(1);
    // b.md에는 s2가 없음 — 같은 앵커명이라도 다른 문서면 miss
    expect(anchorRecallAtK([{ doc: 'b.md', anchor: 's2' }], retrieved)).toBe(0);
  });
  it('복수 라벨은 비율로 계산한다', () => {
    const expected = [
      { doc: 'a.md', anchor: 's1' },
      { doc: 'c.md', anchor: 's9' },
    ];
    expect(anchorRecallAtK(expected, retrieved)).toBe(0.5);
  });
  it('라벨이 없으면 NaN (집계 제외)', () => {
    expect(anchorRecallAtK([], retrieved)).toBeNaN();
  });
});

describe('mean', () => {
  it('NaN을 제외하고 평균을 낸다', () => {
    expect(mean([1, Number.NaN, 0])).toBe(0.5);
  });
  it('유효 표본이 없으면 NaN', () => {
    expect(mean([Number.NaN])).toBeNaN();
  });
});
