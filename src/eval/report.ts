import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GoldItem } from './goldset.js';
import { mean } from './metrics.js';

export interface QuestionResult {
  id: string;
  type: GoldItem['type'];
  language: GoldItem['language'];
  question: string;
  systemAnswerable: boolean;
  answer: string;
  retrievedDocs: string[];
  citedDocs: string[];
  metrics: {
    recall: number;
    reciprocalRank: number;
    citationPrecision: number;
    /** unanswerable 문항: 거부했으면 1. answerable 문항: 거부 안 했으면 1 */
    abstentionCorrect: number;
    faithfulness: number;
    correctness: number;
  };
  judgeReasons: { faithfulness?: string; correctness?: string };
  latencyMs: number;
}

export interface RunConfig {
  timestamp: string;
  retriever: string;
  llmModel: string;
  embeddingModel: string;
  judgeModel: string;
  temperature: number;
  topK: number;
  minScore: number;
  corpusSha: string;
  ragPromptHash: string;
  judgePromptHash: string;
  goldsetHash: string;
  nodeVersion: string;
}

export interface Summary {
  // 주 집계는 en 문항만 — ko 문항은 cross-lingual robustness probe로 분리 집계
  recallAtK: number;
  mrr: number;
  citationPrecision: number;
  abstentionAccuracy: number;
  falseRefusalRate: number;
  faithfulness: number;
  correctness: number;
  byType: Record<string, { count: number; correctness: number; faithfulness: number }>;
  koProbe: { count: number; correctness: number; abstentionAccuracy: number };
}

export function summarize(results: QuestionResult[]): Summary {
  const en = results.filter((r) => r.language === 'en');
  const enAnswerable = en.filter((r) => r.type !== 'unanswerable');
  const enUnanswerable = en.filter((r) => r.type === 'unanswerable');
  const ko = results.filter((r) => r.language === 'ko');
  const koAnswerable = ko.filter((r) => r.type !== 'unanswerable');
  const koUnanswerable = ko.filter((r) => r.type === 'unanswerable');

  const byType: Summary['byType'] = {};
  for (const type of ['factoid', 'summary', 'reasoning', 'unanswerable']) {
    const items = en.filter((r) => r.type === type);
    if (items.length === 0) continue;
    byType[type] = {
      count: items.length,
      correctness: mean(items.map((r) => r.metrics.correctness)),
      faithfulness: mean(items.map((r) => r.metrics.faithfulness)),
    };
  }

  return {
    recallAtK: mean(enAnswerable.map((r) => r.metrics.recall)),
    mrr: mean(enAnswerable.map((r) => r.metrics.reciprocalRank)),
    citationPrecision: mean(enAnswerable.map((r) => r.metrics.citationPrecision)),
    abstentionAccuracy: mean(enUnanswerable.map((r) => r.metrics.abstentionCorrect)),
    falseRefusalRate: 1 - mean(enAnswerable.map((r) => r.metrics.abstentionCorrect)),
    faithfulness: mean(enAnswerable.map((r) => r.metrics.faithfulness)),
    correctness: mean(enAnswerable.map((r) => r.metrics.correctness)),
    byType,
    koProbe: {
      count: ko.length,
      correctness: mean(koAnswerable.map((r) => r.metrics.correctness)),
      abstentionAccuracy: mean(koUnanswerable.map((r) => r.metrics.abstentionCorrect)),
    },
  };
}

function fmt(value: number): string {
  return Number.isNaN(value) ? 'N/A' : value.toFixed(3);
}

export function renderMarkdown(
  config: RunConfig,
  summary: Summary,
  results: QuestionResult[],
): string {
  const lines = [
    `# Eval Report — ${config.timestamp}`,
    '',
    '## Run Config',
    '',
    '| key | value |',
    '|---|---|',
    `| retriever | ${config.retriever} |`,
    `| llmModel | ${config.llmModel} |`,
    `| embeddingModel | ${config.embeddingModel} |`,
    `| judgeModel | ${config.judgeModel} |`,
    `| temperature | ${config.temperature} |`,
    `| topK | ${config.topK} |`,
    `| minScore | ${config.minScore} |`,
    `| corpusSha | ${config.corpusSha.slice(0, 12)} |`,
    `| ragPromptHash | ${config.ragPromptHash.slice(0, 12)} |`,
    `| judgePromptHash | ${config.judgePromptHash.slice(0, 12)} |`,
    `| goldsetHash | ${config.goldsetHash.slice(0, 12)} |`,
    '',
    '## Summary (en 문항 기준)',
    '',
    '| metric | score |',
    '|---|---|',
    `| Recall@k | ${fmt(summary.recallAtK)} |`,
    `| MRR | ${fmt(summary.mrr)} |`,
    `| Citation Precision | ${fmt(summary.citationPrecision)} |`,
    `| Abstention Accuracy (unanswerable) | ${fmt(summary.abstentionAccuracy)} |`,
    `| False Refusal Rate (answerable) | ${fmt(summary.falseRefusalRate)} |`,
    `| Faithfulness (judge) | ${fmt(summary.faithfulness)} |`,
    `| Correctness (judge) | ${fmt(summary.correctness)} |`,
    '',
    '### 유형별 (en)',
    '',
    '| type | n | correctness | faithfulness |',
    '|---|---|---|---|',
    ...Object.entries(summary.byType).map(
      ([type, s]) => `| ${type} | ${s.count} | ${fmt(s.correctness)} | ${fmt(s.faithfulness)} |`,
    ),
    '',
    `### 한국어 probe (분리 집계, n=${summary.koProbe.count})`,
    '',
    `- correctness: ${fmt(summary.koProbe.correctness)}, abstention: ${fmt(summary.koProbe.abstentionAccuracy)}`,
    '',
    '## 문항별 결과',
    '',
    '| id | type | lang | answered | recall | RR | citP | abst | faith | corr | latency |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...results.map((r) =>
      [
        r.id,
        r.type,
        r.language,
        r.systemAnswerable ? 'Y' : 'refuse',
        fmt(r.metrics.recall),
        fmt(r.metrics.reciprocalRank),
        fmt(r.metrics.citationPrecision),
        fmt(r.metrics.abstentionCorrect),
        fmt(r.metrics.faithfulness),
        fmt(r.metrics.correctness),
        `${r.latencyMs}ms`,
      ].join(' | '),
    ),
    '',
  ];
  return lines.join('\n');
}

export async function writeRun(
  runsDir: string,
  config: RunConfig,
  summary: Summary,
  results: QuestionResult[],
): Promise<string> {
  const dirName = `${config.timestamp.replace(/[:.]/g, '-')}_${config.retriever}`;
  const dir = path.join(runsDir, dirName);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  await writeFile(
    path.join(dir, 'results.json'),
    `${JSON.stringify({ summary, results }, null, 2)}\n`,
  );
  await writeFile(path.join(dir, 'report.md'), renderMarkdown(config, summary, results));
  return dir;
}
