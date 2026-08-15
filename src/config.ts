import { z } from 'zod';

// 시스템 경계(환경 변수)에서만 런타임 검증을 수행한다.
const envSchema = z.object({
  ELICE_API_KEY: z.string().min(1),
  ELICE_BASE_URL: z.url(),
  LLM_MODEL: z.string().min(1),
  EMBEDDING_MODEL: z.string().min(1),
  JUDGE_MODEL: z.string().min(1),
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3000),
  /** retrieval top-1 유사도 하한. 기본 0(비활성) — Part B Eval 데이터로 튜닝한다 */
  RETRIEVAL_MIN_SCORE: z.coerce.number().min(0).max(1).default(0),
  TOP_K: z.coerce.number().int().positive().default(5),
  /** Part C 실험 토글: 서버·Eval이 공유하는 검색 전략 선택 */
  RETRIEVER: z.enum(['dense', 'hybrid']).default('dense'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`잘못되었거나 누락된 환경 변수: ${missing} (.env.example 참고)`);
  }
  return parsed.data;
}
