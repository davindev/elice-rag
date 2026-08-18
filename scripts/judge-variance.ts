import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { clientConfigOf, loadConfig } from '../src/config.js';
import { loadGoldset } from '../src/eval/goldset.js';
import { type JudgeDeps, judgeCorrectness, judgeFaithfulness } from '../src/eval/judge.js';
import { createOpenAiCompatibleClient } from '../src/llm/client.js';

/**
 * Judge 판정 분산 실측 (Next Steps).
 *
 * 저장된 run의 동일 답변을 같은 Judge(config의 JUDGE_MODEL)로 N회 재채점해,
 * 문항별 판정이 얼마나 흔들리는지 정량화한다. "±0.5 분산 범위 내"라는
 * 문서 전반의 주장에 실측 근거를 부여한다.
 *
 * 사용법: tsx scripts/judge-variance.ts <run디렉토리> [반복횟수=3]
 */
const GOLDSET_PATH = path.resolve(import.meta.dirname, '../eval/goldset.jsonl');
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

async function main() {
  const runDir = process.argv[2];
  const repeats = Number(process.argv[3] ?? '3');
  if (runDir === undefined)
    throw new Error('사용법: tsx scripts/judge-variance.ts <run디렉토리> [반복=3]');

  const config = loadConfig();
  const llm = createOpenAiCompatibleClient(clientConfigOf(config));
  const judgeDeps: JudgeDeps = { llm, judgeModel: config.JUDGE_MODEL };

  const goldset = new Map((await loadGoldset(GOLDSET_PATH)).map((g) => [g.id, g]));
  const results = JSON.parse(await readFile(path.join(runDir, 'results.json'), 'utf-8'))
    .results as Array<{
    id: string;
    language: string;
    systemAnswerable: boolean;
    answer: string;
    citedChunks: { index: number; content: string }[];
  }>;

  const targets = results.filter((r) => {
    const g = goldset.get(r.id);
    return (
      g !== undefined &&
      r.language === 'en' &&
      g.type !== 'unanswerable' &&
      g.type !== 'injection' &&
      r.systemAnswerable
    );
  });

  console.log(
    `Judge 분산 — judge=${config.JUDGE_MODEL}, 문항 ${targets.length}, 반복 ${repeats}회\n`,
  );

  // 문항별 N회 판정 수집
  const corrRuns: number[][] = [];
  const faithRuns: number[][] = [];
  for (let i = 0; i < repeats; i++) {
    const corr: number[] = [];
    const faith: number[] = [];
    for (const r of targets) {
      const g = goldset.get(r.id)!;
      const citedPassages =
        r.citedChunks.length === 0
          ? '(no passages cited)'
          : r.citedChunks.map((c) => `[${c.index}] ${c.content}`).join('\n\n');
      const conversation = g.history?.map((m) => `${m.role}: ${m.content}`).join('\n');
      const [f, c] = await Promise.all([
        judgeFaithfulness(judgeDeps, {
          question: g.question,
          answer: r.answer,
          citedPassages,
          ...(conversation !== undefined && { conversation }),
        }),
        judgeCorrectness(judgeDeps, {
          question: g.question,
          acceptanceCriteria: g.acceptanceCriteria,
          answer: r.answer,
          ...(g.referenceAnswer !== undefined && { referenceAnswer: g.referenceAnswer }),
          ...(conversation !== undefined && { conversation }),
        }),
      ]);
      faith.push(f.score);
      corr.push(c.score);
    }
    corrRuns.push(corr);
    faithRuns.push(faith);
    console.log(
      `  run ${i + 1}: correctness ${mean(corr).toFixed(3)} / faithfulness ${mean(faith).toFixed(3)}`,
    );
  }

  // 문항별로 N회 중 값이 갈린 문항 집계
  const flip = (runs: number[][]) => {
    const flipped: string[] = [];
    targets.forEach((t, j) => {
      const vals = runs.map((run) => run[j]);
      if (new Set(vals).size > 1) flipped.push(`${t.id}(${vals.join('/')})`);
    });
    return flipped;
  };
  const corrFlip = flip(corrRuns);
  const faithFlip = flip(faithRuns);

  console.log('\n=== 판정 분산 (N회 중 값이 갈린 문항) ===');
  console.log(
    `Correctness  흔들림 ${corrFlip.length}/${targets.length}: ${corrFlip.join(', ') || '없음'}`,
  );
  console.log(
    `Faithfulness 흔들림 ${faithFlip.length}/${targets.length}: ${faithFlip.join(', ') || '없음'}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
