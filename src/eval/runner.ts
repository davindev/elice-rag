import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { CORPUS_PINNED_SHA } from '../corpus-version.js';
import { createPool } from '../db.js';
import { createOpenAiCompatibleClient } from '../llm/client.js';
import { askDetailed, type RagDeps } from '../rag/pipeline.js';
import { INSUFFICIENT_SENTINEL, QUERY_REWRITE_PROMPT, RAG_SYSTEM_PROMPT } from '../rag/prompts.js';
import { createRetriever, RETRIEVER_KINDS, type RetrieverKind } from '../retrieval/index.js';
import { RERANK_CANDIDATE_MULTIPLIER, RERANK_SYSTEM_PROMPT } from '../retrieval/rerank.js';
import { expectsRefusal, type GoldItem, loadGoldset } from './goldset.js';
import {
  CORRECTNESS_JUDGE_PROMPT,
  FAITHFULNESS_JUDGE_PROMPT,
  type JudgeDeps,
  judgeCorrectness,
  judgeFaithfulness,
} from './judge.js';
import { anchorRecallAtK, citationPrecision, recallAtK, reciprocalRank } from './metrics.js';
import { type QuestionResult, summarize, writeRun } from './report.js';
import { checkGates } from './targets.js';

const GOLDSET_PATH = path.resolve(import.meta.dirname, '../../eval/goldset.jsonl');
const RUNS_DIR = path.resolve(import.meta.dirname, '../../eval/runs');

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** --retriever CLI 플래그가 env보다 우선한다 (before/after 실험 편의) */
function resolveRetrieverKind(fallback: RetrieverKind): RetrieverKind {
  const flagIndex = process.argv.indexOf('--retriever');
  if (flagIndex === -1) return fallback;
  const value = process.argv[flagIndex + 1];
  const match = RETRIEVER_KINDS.find((kind) => kind === value);
  if (match === undefined) {
    throw new Error(`--retriever 값이 잘못되었습니다: ${value} (${RETRIEVER_KINDS.join('|')})`);
  }
  return match;
}

async function evaluateItem(
  ragDeps: RagDeps,
  judgeDeps: JudgeDeps,
  item: GoldItem,
  topK: number,
): Promise<QuestionResult> {
  const { result, contexts } = await askDetailed(ragDeps, item.question, topK, item.history ?? []);
  const retrievedDocs = contexts.map((chunk) => chunk.docPath);
  const isRefusalExpected = expectsRefusal(item.type);

  const metrics: QuestionResult['metrics'] = {
    recall: recallAtK(item.expectedEvidence, retrievedDocs),
    anchorRecall: anchorRecallAtK(item.expectedAnchors ?? [], contexts),
    reciprocalRank: reciprocalRank(item.expectedEvidence, retrievedDocs),
    citationPrecision: result.answerable
      ? citationPrecision(
          // precision 판정은 필수 근거 + 검증된 대체 근거(acceptableEvidence)를 모두 정답으로 인정
          [...item.expectedEvidence, ...(item.acceptableEvidence ?? [])],
          result.citations,
        )
      : Number.NaN,
    abstentionCorrect: isRefusalExpected ? (result.answerable ? 0 : 1) : result.answerable ? 1 : 0,
    faithfulness: Number.NaN,
    correctness: Number.NaN,
  };
  const judgeReasons: QuestionResult['judgeReasons'] = {};

  if (!isRefusalExpected) {
    if (!result.answerable) {
      // 답변 가능한 문항을 거부 → correctness 0 (judge 호출 불필요, 결정적)
      metrics.correctness = 0;
      judgeReasons.correctness = '시스템이 응답을 거부함 (false refusal)';
    } else {
      const citedPassages =
        result.citations.length === 0
          ? '(no passages cited)'
          : result.citations
              .map((c) => {
                const chunk = contexts[c.index - 1];
                return `[${c.index}] ${chunk?.content ?? '(missing)'}`;
              })
              .join('\n\n');

      // multiturn 문항의 judge는 후속 질문만으로는 지시대상을 알 수 없으므로 선행 대화를 함께 전달
      const conversation = item.history?.map((m) => `${m.role}: ${m.content}`).join('\n');
      const [faithfulness, correctness] = await Promise.all([
        judgeFaithfulness(judgeDeps, {
          question: item.question,
          answer: result.answer,
          citedPassages,
          ...(conversation !== undefined && { conversation }),
        }),
        judgeCorrectness(judgeDeps, {
          question: item.question,
          acceptanceCriteria: item.acceptanceCriteria,
          answer: result.answer,
          ...(item.referenceAnswer !== undefined && { referenceAnswer: item.referenceAnswer }),
          ...(conversation !== undefined && { conversation }),
        }),
      ]);
      metrics.faithfulness = faithfulness.score;
      metrics.correctness = correctness.score;
      judgeReasons.faithfulness = faithfulness.reason;
      judgeReasons.correctness = correctness.reason;
    }
  }

  return {
    id: item.id,
    type: item.type,
    language: item.language,
    question: item.question,
    systemAnswerable: result.answerable,
    answer: result.answer,
    ...(result.rewrittenQuestion !== undefined && { rewrittenQuestion: result.rewrittenQuestion }),
    retrievedDocs,
    citedDocs: [...new Set(result.citations.map((c) => c.docPath))],
    citedChunks: result.citations.map((c) => ({
      index: c.index,
      chunkId: c.chunkId,
      docPath: c.docPath,
      url: c.url,
      content: contexts[c.index - 1]?.content ?? '',
    })),
    metrics,
    judgeReasons,
    latencyMs: result.latencyMs,
  };
}

async function main() {
  const config = loadConfig();
  const retrieverKind = resolveRetrieverKind(config.RETRIEVER);
  const pool = createPool(config.DATABASE_URL);
  const llm = createOpenAiCompatibleClient(config);

  const rerankModel = config.RERANK_MODEL ?? config.LLM_MODEL;
  // rerank fallback(파싱 실패 → 원 순위 사용)은 rerank arm에 dense 결과를 섞으므로
  // 반드시 run 메타데이터에 남긴다 — 0이어야 "순수한 rerank run"이라고 주장할 수 있다
  let rerankFallbackCount = 0;
  const ragDeps: RagDeps = {
    retriever: createRetriever(retrieverKind, {
      pool,
      llm,
      rerankModel,
      rerankOptions: {
        onFallback: (raw) => {
          rerankFallbackCount += 1;
          console.warn(`rerank 파싱 실패 → 원 순위 fallback: ${raw.slice(0, 120)}`);
        },
      },
    }),
    llm,
    llmModel: config.LLM_MODEL,
    minScore: config.RETRIEVAL_MIN_SCORE,
  };
  const judgeDeps: JudgeDeps = { llm, judgeModel: config.JUDGE_MODEL };

  const goldset = await loadGoldset(GOLDSET_PATH);
  console.log(`Eval 시작: ${goldset.length}문항, retriever=${retrieverKind}`);

  const results: QuestionResult[] = [];
  for (const item of goldset) {
    const result = await evaluateItem(ragDeps, judgeDeps, item, config.TOP_K);
    results.push(result);
    const corr = Number.isNaN(result.metrics.correctness)
      ? '-'
      : result.metrics.correctness.toFixed(1);
    console.log(
      `  ${item.id} [${item.type}] answered=${result.systemAnswerable ? 'Y' : 'N'} corr=${corr}`,
    );
  }

  const summary = summarize(results);
  const runDir = await writeRun(
    RUNS_DIR,
    {
      timestamp: new Date().toISOString(),
      retriever: retrieverKind,
      llmModel: config.LLM_MODEL,
      embeddingModel: config.EMBEDDING_MODEL,
      judgeModel: config.JUDGE_MODEL,
      temperature: 0,
      topK: config.TOP_K,
      minScore: config.RETRIEVAL_MIN_SCORE,
      corpusSha: CORPUS_PINNED_SHA,
      ragPromptHash: sha256(RAG_SYSTEM_PROMPT + INSUFFICIENT_SENTINEL),
      rewritePromptHash: sha256(QUERY_REWRITE_PROMPT),
      judgePromptHash: sha256(FAITHFULNESS_JUDGE_PROMPT + CORRECTNESS_JUDGE_PROMPT),
      goldsetHash: sha256(await readFile(GOLDSET_PATH, 'utf-8')),
      nodeVersion: process.version,
      // rerank run의 재현성: rerank 고유 설정을 함께 기록 (다른 retriever면 생략)
      ...(retrieverKind === 'rerank' && {
        rerankModel,
        rerankCandidateK: config.TOP_K * RERANK_CANDIDATE_MULTIPLIER,
        rerankPromptHash: sha256(RERANK_SYSTEM_PROMPT),
        rerankFallbackCount,
      }),
    },
    summary,
    results,
  );

  console.log('\n===== Summary (en) =====');
  console.log(`Recall@k (doc)      ${summary.recallAtK.toFixed(3)}`);
  console.log(`Anchor Recall@k     ${summary.anchorRecallAtK.toFixed(3)}`);
  console.log(`MRR                 ${summary.mrr.toFixed(3)}`);
  console.log(`Citation Precision  ${summary.citationPrecision.toFixed(3)}`);
  console.log(`Abstention Accuracy ${summary.abstentionAccuracy.toFixed(3)}`);
  console.log(`False Refusal Rate  ${summary.falseRefusalRate.toFixed(3)}`);
  console.log(`Faithfulness        ${summary.faithfulness.toFixed(3)}`);
  console.log(`Correctness         ${summary.correctness.toFixed(3)}`);

  const violations = checkGates(summary);
  if (violations.length > 0) {
    console.log('\n⚠️  gate 미달 metric:');
    for (const v of violations) {
      const op = v.direction === 'min' ? '>=' : '<=';
      console.log(`  - ${v.label}: ${v.actual.toFixed(3)} (gate ${op} ${v.gate})`);
    }
  } else {
    console.log('\n✅ 모든 metric gate 통과');
  }
  console.log(`\nreport: ${runDir}/report.md`);

  await pool.end();

  // CI 회귀 차단용: --strict면 gate 미달 시 실패 종료
  if (violations.length > 0 && process.argv.includes('--strict')) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
