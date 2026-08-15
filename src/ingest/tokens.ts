import { getEncoding } from 'js-tiktoken';

// cl100k_base는 실제 서빙 모델의 토크나이저와 다를 수 있는 근사치다.
// 청킹 상한 계산에만 사용하므로 오차가 시스템 동작에 영향을 주지 않는다 (README 한계점에 기록).
const encoder = getEncoding('cl100k_base');

export function countTokens(text: string): number {
  return encoder.encode(text).length;
}
