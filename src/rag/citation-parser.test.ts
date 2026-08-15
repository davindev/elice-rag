import { describe, expect, it } from 'vitest';
import { parseCitations } from './citation-parser.js';

describe('parseCitations', () => {
  it('유효한 인용 번호를 등장 순서대로 중복 없이 추출한다', () => {
    const { text, citedIndices } = parseCitations('A [2]. B [1][2]. C [3].', 3);
    expect(citedIndices).toEqual([2, 1, 3]);
    expect(text).toBe('A [2]. B [1][2]. C [3].');
  });

  it('컨텍스트 범위를 벗어난 인용 번호를 본문에서 제거한다', () => {
    const { text, citedIndices } = parseCitations('Fact [1]. Fake [9].', 3);
    expect(citedIndices).toEqual([1]);
    expect(text).toBe('Fact [1]. Fake .');
  });

  it('[0]은 유효하지 않은 인용으로 처리한다', () => {
    const { citedIndices } = parseCitations('Zero [0] and one [1].', 3);
    expect(citedIndices).toEqual([1]);
  });

  it('인용이 없으면 빈 배열을 반환한다', () => {
    const { citedIndices } = parseCitations('No citations here.', 5);
    expect(citedIndices).toEqual([]);
  });
});
