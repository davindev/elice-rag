/**
 * LLM 답변에서 [n] 인용 마커를 추출·검증한다.
 *
 * - contextCount 범위를 벗어난 인용 번호(모델이 지어낸 번호)는 본문에서 제거 —
 *   존재하지 않는 근거를 가리키는 hallucinated citation 방지
 * - 유효한 인용 번호는 등장 순서를 유지하며 중복 제거해 반환
 */
export interface ParsedCitations {
  /** 유효하지 않은 마커가 제거된 답변 본문 */
  text: string;
  /** 인용된 컨텍스트 인덱스(1-base), 등장 순서 */
  citedIndices: number[];
}

const MARKER_RE = /\[(\d{1,2})\]/g;

export function parseCitations(answer: string, contextCount: number): ParsedCitations {
  const citedIndices: number[] = [];

  const text = answer.replace(MARKER_RE, (marker, digits: string) => {
    const index = Number(digits);
    if (index < 1 || index > contextCount) return '';
    if (!citedIndices.includes(index)) citedIndices.push(index);
    return marker;
  });

  return { text: text.trim(), citedIndices };
}
