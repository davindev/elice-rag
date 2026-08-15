import { describe, expect, it } from 'vitest';
import type { Citation } from '../rag/pipeline.js';
import { citationPrecision, mean, recallAtK, reciprocalRank } from './metrics.js';

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

describe('mean', () => {
  it('NaN을 제외하고 평균을 낸다', () => {
    expect(mean([1, Number.NaN, 0])).toBe(0.5);
  });
  it('유효 표본이 없으면 NaN', () => {
    expect(mean([Number.NaN])).toBeNaN();
  });
});
