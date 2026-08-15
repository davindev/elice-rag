import { z } from '@hono/zod-openapi';

export const askRequestSchema = z
  .object({
    question: z.string().min(1).max(2000).openapi({
      example: 'What does useState return?',
      description: '문서에 대해 질의할 자연어 질문',
    }),
    topK: z.number().int().min(1).max(20).optional().openapi({
      description: '검색할 컨텍스트 수 (기본값: 서버 설정)',
    }),
  })
  .openapi('AskRequest');

export const citationSchema = z
  .object({
    index: z.number().int().openapi({ description: '답변 본문의 [n] 마커와 대응하는 번호' }),
    chunkId: z.string(),
    docPath: z.string().openapi({ example: 'reference/react/useState.md' }),
    headingPath: z.array(z.string()).openapi({ example: ['useState', 'Reference'] }),
    url: z.string().openapi({ example: 'https://react.dev/reference/react/useState#reference' }),
    score: z.number().openapi({
      description:
        '검색 점수 — 의미는 서버의 RETRIEVER 설정에 따름 (dense: cosine similarity, hybrid: RRF, rerank: dense 원 점수)',
    }),
  })
  .openapi('Citation');

export const askResponseSchema = z
  .object({
    answerable: z
      .boolean()
      .openapi({ description: 'false면 문서에서 근거를 찾지 못해 응답을 거부한 것' }),
    answer: z.string(),
    citations: z.array(citationSchema),
    model: z.string(),
    usage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number(),
    }),
    latencyMs: z.number(),
  })
  .openapi('AskResponse');

export const errorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi('ErrorResponse');
