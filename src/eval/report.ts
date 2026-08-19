import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expectsRefusal, GOLD_TYPES, type GoldItem } from './goldset.js';
import { mean } from './metrics.js';
import { evaluateTarget, METRIC_TARGETS } from './targets.js';

export interface QuestionResult {
  id: string;
  type: GoldItem['type'];
  language: GoldItem['language'];
  question: string;
  systemAnswerable: boolean;
  answer: string;
  /** multiturn 문항에서 실제 검색에 쓰인 리라이팅 질의 (관측성) */
  rewrittenQuestion?: string;
  retrievedDocs: string[];
  /** 검색된 청크의 섹션 위치("docPath > heading path") — 인용 안 된 컨텍스트까지 사후 분석 가능하게 */
  retrievedSections: string[];
  citedDocs: string[];
  /** 답변이 인용한 청크 원문 — human labeling 시 대조 자료 (재검색 없이 결과 파일만으로 검증 가능) */
  citedChunks: { index: number; chunkId: string; docPath: string; url: string; content: string }[];
  metrics: {
    recall: number;
    /** 앵커(섹션) 단위 recall — expectedAnchors 라벨이 있는 문항만 (없으면 NaN) */
    anchorRecall: number;
    reciprocalRank: number;
    citationPrecision: number;
    /** 거부가 정답인 유형(unanswerable·injection): 거부했으면 1. 그 외: 거부 안 했으면 1 */
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
  /** null = 모델이 temperature 미지원(reasoning)이라 파라미터를 보내지 않음 */
  temperature: number | null;
  topK: number;
  minScore: number;
  corpusSha: string;
  /** 임베딩 입력 방식 — 필드가 없는 run은 content 체계다. 체계가 다른 run끼리는 검색 지표 비교 불가 */
  embeddingInput?: 'content' | 'breadcrumb+content';
  /** 실제 DB 인덱스에서 파생한 지문 — 코퍼스·청킹·임베딩 체계가 하나라도 다르면 달라짐 */
  indexChunkCount?: number;
  indexIdsSha?: string;
  /** --strict 실행 여부 — "gate가 차단했다"는 주장의 검증 근거 */
  strictMode?: boolean;
  ragPromptHash: string;
  /** 멀티턴 리라이팅 프롬프트 해시 — multiturn 문항 결과를 좌우하는 실험 파라미터 */
  rewritePromptHash?: string;
  judgePromptHash: string;
  goldsetHash: string;
  nodeVersion: string;
  /** rerank run 전용 메타데이터 — 재현성·실험 무결성 (fallback이 비어 있어야 순수 rerank arm) */
  rerankModel?: string;
  rerankCandidateK?: number;
  rerankPromptHash?: string;
  rerankFallbackCount?: number;
  /** fallback이 발생한 문항 id — 문항 단위 비교 시 오염 여부 판정용 */
  rerankFallbackIds?: string[];
  /** hybrid-rerank 전용: hybrid 내부 융합의 실제 DB 검색 깊이 (dense/FTS 각각) */
  hybridFusionSearchDepth?: number;
}

export interface Summary {
  // 주 집계는 en 문항만 — ko 문항은 cross-lingual robustness probe로 분리 집계
  recallAtK: number;
  anchorRecallAtK: number;
  mrr: number;
  citationPrecision: number;
  abstentionAccuracy: number;
  falseRefusalRate: number;
  faithfulness: number;
  correctness: number;
  byType: Record<string, { count: number; correctness: number; faithfulness: number }>;
  koProbe: {
    count: number;
    correctness: number;
    abstentionAccuracy: number;
    falseRefusalRate: number;
  };
}

export function summarize(results: QuestionResult[]): Summary {
  const en = results.filter((r) => r.language === 'en');
  const enAnswerable = en.filter((r) => !expectsRefusal(r.type));
  const enRefusalExpected = en.filter((r) => expectsRefusal(r.type));
  const ko = results.filter((r) => r.language === 'ko');
  const koAnswerable = ko.filter((r) => !expectsRefusal(r.type));
  const koRefusalExpected = ko.filter((r) => expectsRefusal(r.type));

  const byType: Summary['byType'] = {};
  for (const type of GOLD_TYPES) {
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
    anchorRecallAtK: mean(enAnswerable.map((r) => r.metrics.anchorRecall)),
    mrr: mean(enAnswerable.map((r) => r.metrics.reciprocalRank)),
    citationPrecision: mean(enAnswerable.map((r) => r.metrics.citationPrecision)),
    abstentionAccuracy: mean(enRefusalExpected.map((r) => r.metrics.abstentionCorrect)),
    falseRefusalRate: 1 - mean(enAnswerable.map((r) => r.metrics.abstentionCorrect)),
    faithfulness: mean(enAnswerable.map((r) => r.metrics.faithfulness)),
    correctness: mean(enAnswerable.map((r) => r.metrics.correctness)),
    byType,
    koProbe: {
      count: ko.length,
      correctness: mean(koAnswerable.map((r) => r.metrics.correctness)),
      abstentionAccuracy: mean(koRefusalExpected.map((r) => r.metrics.abstentionCorrect)),
      // ko의 false refusal은 en 헤드라인에 안 잡히므로 반드시 여기서 노출 (gate는 en만 유지)
      falseRefusalRate: 1 - mean(koAnswerable.map((r) => r.metrics.abstentionCorrect)),
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
    ...(config.embeddingInput === undefined
      ? []
      : [`| embeddingInput | ${config.embeddingInput} |`]),
    ...(config.indexIdsSha === undefined
      ? []
      : [
          `| indexFingerprint | ${config.indexChunkCount}청크 / ${config.indexIdsSha.slice(0, 12)} |`,
        ]),
    ...(config.strictMode === undefined ? [] : [`| strictMode | ${config.strictMode} |`]),
    `| ragPromptHash | ${config.ragPromptHash.slice(0, 12)} |`,
    ...(config.rewritePromptHash === undefined
      ? []
      : [`| rewritePromptHash | ${config.rewritePromptHash.slice(0, 12)} |`]),
    `| judgePromptHash | ${config.judgePromptHash.slice(0, 12)} |`,
    `| goldsetHash | ${config.goldsetHash.slice(0, 12)} |`,
    ...(config.rerankModel === undefined
      ? []
      : [
          `| rerankModel | ${config.rerankModel} |`,
          `| rerankCandidateK | ${config.rerankCandidateK} |`,
          `| rerankPromptHash | ${config.rerankPromptHash?.slice(0, 12)} |`,
          `| rerankFallbackCount | ${config.rerankFallbackCount} |`,
        ]),
    '',
    '## Summary (en 문항 기준)',
    '',
    'gate = 회귀 차단 기준(`pnpm eval --strict` 실행 시 미달이면 exit 1), target = 개선 목표 (근거: src/eval/targets.ts)',
    '',
    '| metric | score | gate | target | 상태 |',
    '|---|---|---|---|---|',
    ...METRIC_TARGETS.map((t) => {
      const actual = summary[t.key];
      const op = t.direction === 'min' ? '≥' : '≤';
      const statusLabel = {
        target: '🎯 target 달성',
        gate: '✅ gate 통과',
        fail: '❌ gate 미달',
        na: 'N/A',
      }[evaluateTarget(t, actual)];
      return `| ${t.label} | ${fmt(actual)} | ${op} ${t.gate} | ${op} ${t.target} | ${statusLabel} |`;
    }),
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
    `- correctness: ${fmt(summary.koProbe.correctness)}, abstention: ${fmt(summary.koProbe.abstentionAccuracy)}, false refusal: ${fmt(summary.koProbe.falseRefusalRate)}`,
    '',
    '## 문항별 결과',
    '',
    '| id | type | lang | answered | recall | aRecall | RR | citP | abst | faith | corr | latency |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...results.map((r) =>
      [
        r.id,
        r.type,
        r.language,
        r.systemAnswerable ? 'Y' : 'refuse',
        fmt(r.metrics.recall),
        fmt(r.metrics.anchorRecall),
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
