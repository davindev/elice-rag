import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { HistoryMessage } from '../rag/pipeline.js';

/**
 * 문항 유형의 단일 소스 — schema(zod enum), report의 byType 순회,
 * 거부 채점 극성(runner)과 abstention 분모(report)가 전부 여기를 참조한다.
 *
 * misconception: 틀린 전제가 깔린 질문 — 전제를 교정해야 정답 (sycophancy 탐침)
 * multiturn: history가 있는 후속 질문 — 쿼리 리라이팅 품질 측정
 * injection: 지시 무시를 유도하는 질문 — 거부가 정답 (안전성 탐침)
 */
export const GOLD_TYPES = [
  'factoid',
  'summary',
  'reasoning',
  'multihop',
  'misconception',
  'multiturn',
  'injection',
  'unanswerable',
] as const;
export type GoldType = (typeof GOLD_TYPES)[number];

/** 거부가 정답인 유형 — runner의 채점 극성과 report의 abstention 분모가 같은 규칙을 쓴다 */
export const REFUSAL_TYPES = ['unanswerable', 'injection'] as const satisfies readonly GoldType[];

export function expectsRefusal(type: GoldType): boolean {
  return (REFUSAL_TYPES as readonly GoldType[]).includes(type);
}

// pipeline의 HistoryMessage와 형태가 어긋나면 컴파일 실패하도록 타입을 고정
const historyMessageSchema: z.ZodType<HistoryMessage> = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

// goldset.jsonl은 손으로 편집하는 데이터 파일(시스템 경계)이므로 런타임 검증한다
const goldItemSchema = z.object({
  id: z.string(),
  type: z.enum(GOLD_TYPES),
  language: z.enum(['en', 'ko']),
  question: z.string().min(1),
  /** multiturn 문항의 선행 대화 — runner가 파이프라인에 그대로 전달 */
  history: z.array(historyMessageSchema).optional(),
  expectedEvidence: z.array(z.string()),
  /**
   * 앵커(섹션) 단위 근거 라벨 — 문서 단위 Recall이 포화된 corpus에서 검색 변별력 확보용.
   * 요약 등 문서 전체가 근거인 문항은 라벨을 생략한다 (해당 문항은 anchorRecall 집계에서 제외).
   */
  expectedAnchors: z.array(z.object({ doc: z.string(), anchor: z.string() })).optional(),
  /**
   * 인용해도 정당한 추가 문서 — Citation Precision 판정에만 사용 (Recall에는 불포함).
   * expectedEvidence(필수 근거)와 분리한 이유: corpus에 챕터 인덱스 등 같은 내용을
   * 담은 문서가 복수 존재해, "필요한 것을 찾았는가"(recall)와 "인용이 정당한가"(precision)의
   * 기준 문서 집합이 다르기 때문. 시스템이 인용한 라벨 밖 문서를 corpus 원문 대조로
   * 검증해 정당한 경우에만 추가한다 (감사 이력은 notes에 기록).
   */
  acceptableEvidence: z.array(z.string()).optional(),
  acceptanceCriteria: z.string().min(1),
  referenceAnswer: z.string().optional(),
  notes: z.string().optional(),
});

export type GoldItem = z.infer<typeof goldItemSchema>;

export async function loadGoldset(filePath: string): Promise<GoldItem[]> {
  const raw = await readFile(filePath, 'utf-8');
  const items = raw
    .trim()
    .split('\n')
    .map((line, i) => {
      const parsed = goldItemSchema.safeParse(JSON.parse(line));
      if (!parsed.success) {
        throw new Error(`goldset ${i + 1}번째 줄 검증 실패: ${parsed.error.message}`);
      }
      return parsed.data;
    });

  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) throw new Error('goldset에 중복 id가 있습니다');
  return items;
}
