import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { QuestionResult } from '../src/eval/report.js';

/**
 * LLM Judge와 사람 라벨의 일치율을 측정한다 (Judge Human-Alignment 검증).
 *
 * 사용법: pnpm exec tsx scripts/judge-agreement.ts
 *
 * eval/human-labels.jsonl: 사람이 judge 점수 비공개 상태에서 동일 rubric으로 채점한 라벨.
 * 각 줄: {"id","metric","humanScore","run"} — run은 채점 대상 답변이 나온
 * eval/runs/<run> 디렉토리명 (라벨은 특정 run의 답변에 대한 판정이므로 반드시 그 run과 비교).
 */

// 과거 run은 스키마가 더 좁다(citedChunks 등이 없는 run이 eval/runs에 실재) — 실제로 읽는 필드만 주장한다
type ScoredResult = Pick<QuestionResult, 'id' | 'metrics'>;

const LABELS_PATH = path.resolve(import.meta.dirname, '../eval/human-labels.jsonl');
const RUNS_DIR = path.resolve(import.meta.dirname, '../eval/runs');

// 손으로 작성한 파일 = 시스템 경계이므로 zod로 검증한다
const humanLabelSchema = z.object({
  id: z.string(),
  metric: z.enum(['faithfulness', 'correctness']),
  humanScore: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  run: z.string().min(1),
});

async function main() {
  const labels = (await readFile(LABELS_PATH, 'utf-8'))
    .trim()
    .split('\n')
    .map((line) => humanLabelSchema.parse(JSON.parse(line)));

  const runNames = [...new Set(labels.map((l) => l.run))];
  const runs = new Map<string, Map<string, ScoredResult['metrics']>>();
  for (const run of runNames) {
    // N/A metric(NaN)은 JSON 직렬화 시 null이 되므로, 읽을 때 NaN으로 복원해 코드 규약과 맞춘다
    const { results } = JSON.parse(
      await readFile(path.join(RUNS_DIR, run, 'results.json'), 'utf-8'),
      (_, value) => (value === null ? Number.NaN : value),
    ) as { results: ScoredResult[] };
    runs.set(run, new Map(results.map((r) => [r.id, r.metrics])));
  }

  let exact = 0;
  let within = 0; // 0.5 이내 (인접 등급 허용)
  let compared = 0;
  const disagreements: string[] = [];

  for (const label of labels) {
    const judgeScore = runs.get(label.run)?.get(label.id)?.[label.metric];
    if (judgeScore === undefined || Number.isNaN(judgeScore)) continue;
    compared += 1;
    const diff = Math.abs(judgeScore - label.humanScore);
    if (diff === 0) exact += 1;
    if (diff <= 0.5) within += 1;
    else
      disagreements.push(
        `${label.id}/${label.metric} (${label.run}): human=${label.humanScore} judge=${judgeScore}`,
      );
  }

  console.log(`비교 표본: ${compared}건 (run ${runNames.length}개)`);
  console.log(`정확 일치율: ${((exact / compared) * 100).toFixed(1)}%`);
  console.log(`인접 등급 포함 일치율(±0.5): ${((within / compared) * 100).toFixed(1)}%`);
  if (disagreements.length > 0) {
    console.log('\n큰 불일치(>0.5):');
    for (const d of disagreements) console.log(`  ${d}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
