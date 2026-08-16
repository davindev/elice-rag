import { z } from 'zod';
import type { LlmClient } from '../llm/client.js';

/**
 * LLM-as-a-Judge.
 *
 * 신뢰성 확보 장치:
 * - temperature 0 + 명시적 rubric + few-shot 예시로 판정 분산 최소화
 * - 생성 모델과 다른 judge 모델 사용을 전제로 한다 (self-preference bias 완화)
 * - 프롬프트는 export하여 run 메타데이터에 해시로 기록 → 판정 기준 변경 추적
 * - human-labels.jsonl과의 일치율을 별도 스크립트로 측정해 README에 기록
 */

const verdictSchema = z.object({
  score: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  reason: z.string(),
});

export type JudgeVerdict = z.infer<typeof verdictSchema>;

export const FAITHFULNESS_JUDGE_PROMPT = `You are a strict evaluator of grounded question answering.
You will receive a question, an answer with citation markers like [1], and the numbered context passages that were cited.

Judge ONLY whether every factual claim in the answer is supported by the given passages.
Ignore whether the answer is a good answer to the question — that is evaluated separately.

Scoring rubric:
- 1: every factual claim is directly supported by the passages
- 0.5: the answer is mostly supported, but contains a minor detail not found in the passages
- 0: at least one central claim is unsupported by or contradicts the passages

Example:
Passages: "[1] useRef returns an object with a single current property."
Answer: "useRef returns an object with a current property [1]. It is commonly used for storing timeout IDs."
Verdict: {"score": 0.5, "reason": "The current-property claim is supported by [1], but the timeout-ID use case does not appear in the passages."}

Respond with ONLY a JSON object: {"score": 0 | 0.5 | 1, "reason": "<short explanation>"}`;

export const CORRECTNESS_JUDGE_PROMPT = `You are a strict evaluator of question answering quality.
You will receive a question, acceptance criteria describing what a correct answer must contain, optionally a reference answer, and the actual answer.

Judge ONLY whether the answer satisfies the acceptance criteria. Do not reward extra information, and do not penalize missing information that the criteria do not require. Citation markers like [1] in the answer should be ignored.

Scoring rubric:
- 1: the answer satisfies all requirements in the acceptance criteria
- 0.5: the answer satisfies the core requirement but misses a secondary requirement
- 0: the answer misses the core requirement, is wrong, or refuses to answer even though criteria describe an answerable question

Example:
Criteria: "States that useState returns an array of two values: the current state and a set function."
Answer: "useState returns the current state value."
Verdict: {"score": 0.5, "reason": "Mentions the current state but omits the set function, which the criteria require."}

Respond with ONLY a JSON object: {"score": 0 | 0.5 | 1, "reason": "<short explanation>"}`;

export interface JudgeDeps {
  llm: LlmClient;
  judgeModel: string;
}

/** multiturn 문항: 후속 질문만으로는 지시대상("it", "그거")을 알 수 없어 선행 대화를 함께 제공 */
function conversationBlock(conversation?: string): string {
  return conversation === undefined
    ? ''
    : `Conversation so far (the question below is a follow-up in this conversation):\n${conversation}\n\n`;
}

export async function judgeFaithfulness(
  deps: JudgeDeps,
  params: { question: string; answer: string; citedPassages: string; conversation?: string },
): Promise<JudgeVerdict> {
  const user = `${conversationBlock(params.conversation)}Question: ${params.question}\n\nCited passages:\n${params.citedPassages}\n\nAnswer:\n${params.answer}`;
  return runJudge(deps, FAITHFULNESS_JUDGE_PROMPT, user);
}

export async function judgeCorrectness(
  deps: JudgeDeps,
  params: {
    question: string;
    acceptanceCriteria: string;
    referenceAnswer?: string;
    answer: string;
    conversation?: string;
  },
): Promise<JudgeVerdict> {
  const reference =
    params.referenceAnswer === undefined ? '' : `\n\nReference answer: ${params.referenceAnswer}`;
  const user = `${conversationBlock(params.conversation)}Question: ${params.question}\n\nAcceptance criteria: ${params.acceptanceCriteria}${reference}\n\nAnswer:\n${params.answer}`;
  return runJudge(deps, CORRECTNESS_JUDGE_PROMPT, user);
}

async function runJudge(deps: JudgeDeps, system: string, user: string): Promise<JudgeVerdict> {
  const { content } = await deps.llm.chat(deps.judgeModel, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  return parseVerdict(content);
}

/** judge 출력(외부 시스템 경계)은 형식을 신뢰할 수 없으므로 JSON 추출 후 zod 검증 */
export function parseVerdict(content: string): JudgeVerdict {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error(`judge 응답에서 JSON을 찾지 못했습니다: ${content.slice(0, 200)}`);
  }
  const parsed = verdictSchema.safeParse(JSON.parse(content.slice(start, end + 1)));
  if (!parsed.success) {
    throw new Error(`judge 응답 검증 실패: ${parsed.error.message}`);
  }
  return parsed.data;
}
