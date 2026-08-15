import { readFile } from 'node:fs/promises';
import { z } from 'zod';

/**
 * LLM Judge와 사람 라벨의 일치율을 측정한다 (Judge Human-Alignment 검증).
 *
 * 사용법: pnpm exec tsx scripts/judge-agreement.ts eval/runs/<run>/results.json
 *
 * eval/human-labels.jsonl: baseline run의 답변을 사람이 직접 채점한 라벨.
 * 각 줄: {"id": "q01", "metric": "faithfulness"|"correctness", "humanScore": 0|0.5|1}
 */
const humanLabelSchema = z.object({
  id: z.string(),
  metric: z.enum(['faithfulness', 'correctness']),
  humanScore: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
});

// N/A metric(NaN)은 JSON 직렬화 과정에서 null이 된다
const resultsSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      metrics: z.object({
        faithfulness: z.number().nullable(),
        correctness: z.number().nullable(),
      }),
    }),
  ),
});

async function main() {
  const resultsPath = process.argv[2];
  if (resultsPath === undefined) {
    throw new Error('사용법: tsx scripts/judge-agreement.ts <run results.json 경로>');
  }

  const labels = (await readFile('eval/human-labels.jsonl', 'utf-8'))
    .trim()
    .split('\n')
    .map((line) => humanLabelSchema.parse(JSON.parse(line)));
  const { results } = resultsSchema.parse(JSON.parse(await readFile(resultsPath, 'utf-8')));
  const byId = new Map(results.map((r) => [r.id, r.metrics]));

  let exact = 0;
  let within = 0; // 0.5 이내 (인접 등급 허용)
  let compared = 0;
  const disagreements: string[] = [];

  for (const label of labels) {
    const metrics = byId.get(label.id);
    if (metrics === undefined) continue;
    const judgeScore = metrics[label.metric];
    if (judgeScore === null) continue;
    compared += 1;
    const diff = Math.abs(judgeScore - label.humanScore);
    if (diff === 0) exact += 1;
    if (diff <= 0.5) within += 1;
    else
      disagreements.push(
        `${label.id}/${label.metric}: human=${label.humanScore} judge=${judgeScore}`,
      );
  }

  console.log(`비교 표본: ${compared}건`);
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
