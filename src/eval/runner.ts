import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { CORPUS_PINNED_SHA } from '../corpus-version.js';
import { createPool } from '../db.js';
import { createOpenAiCompatibleClient } from '../llm/client.js';
import { askDetailed, type RagDeps } from '../rag/pipeline.js';
import { INSUFFICIENT_SENTINEL, RAG_SYSTEM_PROMPT } from '../rag/prompts.js';
import { createRetriever, type RetrieverKind } from '../retrieval/index.js';
import { type GoldItem, loadGoldset } from './goldset.js';
import {
  CORRECTNESS_JUDGE_PROMPT,
  FAITHFULNESS_JUDGE_PROMPT,
  type JudgeDeps,
  judgeCorrectness,
  judgeFaithfulness,
} from './judge.js';
import { citationPrecision, recallAtK, reciprocalRank } from './metrics.js';
import { type QuestionResult, summarize, writeRun } from './report.js';

const GOLDSET_PATH = path.resolve(import.meta.dirname, '../../eval/goldset.jsonl');
const RUNS_DIR = path.resolve(import.meta.dirname, '../../eval/runs');

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** --retriever dense|hybrid CLI 플래그가 env보다 우선한다 (before/after 실험 편의) */
function resolveRetrieverKind(fallback: RetrieverKind): RetrieverKind {
  const flagIndex = process.argv.indexOf('--retriever');
  if (flagIndex === -1) return fallback;
  const value = process.argv[flagIndex + 1];
  if (value !== 'dense' && value !== 'hybrid') {
    throw new Error(`--retriever 값이 잘못되었습니다: ${value} (dense|hybrid)`);
  }
  return value;
}

async function evaluateItem(
  ragDeps: RagDeps,
  judgeDeps: JudgeDeps,
  item: GoldItem,
  topK: number,
): Promise<QuestionResult> {
  const { result, contexts } = await askDetailed(ragDeps, item.question, topK);
  const retrievedDocs = contexts.map((chunk) => chunk.docPath);
  const isUnanswerable = item.type === 'unanswerable';

  const metrics: QuestionResult['metrics'] = {
    recall: recallAtK(item.expectedEvidence, retrievedDocs),
    reciprocalRank: reciprocalRank(item.expectedEvidence, retrievedDocs),
    citationPrecision: result.answerable
      ? citationPrecision(item.expectedEvidence, result.citations)
      : Number.NaN,
    abstentionCorrect: isUnanswerable ? (result.answerable ? 0 : 1) : result.answerable ? 1 : 0,
    faithfulness: Number.NaN,
    correctness: Number.NaN,
  };
  const judgeReasons: QuestionResult['judgeReasons'] = {};

  if (!isUnanswerable) {
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

      const [faithfulness, correctness] = await Promise.all([
        judgeFaithfulness(judgeDeps, {
          question: item.question,
          answer: result.answer,
          citedPassages,
        }),
        judgeCorrectness(judgeDeps, {
          question: item.question,
          acceptanceCriteria: item.acceptanceCriteria,
          answer: result.answer,
          ...(item.referenceAnswer !== undefined && { referenceAnswer: item.referenceAnswer }),
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
    retrievedDocs,
    citedDocs: [...new Set(result.citations.map((c) => c.docPath))],
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

  const ragDeps: RagDeps = {
    retriever: createRetriever(retrieverKind, pool, llm),
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
      judgePromptHash: sha256(FAITHFULNESS_JUDGE_PROMPT + CORRECTNESS_JUDGE_PROMPT),
      goldsetHash: sha256(await readFile(GOLDSET_PATH, 'utf-8')),
      nodeVersion: process.version,
    },
    summary,
    results,
  );

  console.log('\n===== Summary (en) =====');
  console.log(`Recall@k            ${summary.recallAtK.toFixed(3)}`);
  console.log(`MRR                 ${summary.mrr.toFixed(3)}`);
  console.log(`Citation Precision  ${summary.citationPrecision.toFixed(3)}`);
  console.log(`Abstention Accuracy ${summary.abstentionAccuracy.toFixed(3)}`);
  console.log(`False Refusal Rate  ${summary.falseRefusalRate.toFixed(3)}`);
  console.log(`Faithfulness        ${summary.faithfulness.toFixed(3)}`);
  console.log(`Correctness         ${summary.correctness.toFixed(3)}`);
  console.log(`\nreport: ${runDir}/report.md`);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
