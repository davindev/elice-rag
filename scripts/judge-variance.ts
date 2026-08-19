import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { clientConfigOf, loadConfig } from '../src/config.js';
import { expectsRefusal, loadGoldset } from '../src/eval/goldset.js';
import { type JudgeDeps, judgeCorrectness, judgeFaithfulness } from '../src/eval/judge.js';
import { mean } from '../src/eval/metrics.js';
import type { QuestionResult } from '../src/eval/report.js';
import { createOpenAiCompatibleClient } from '../src/llm/client.js';

// 과거 run은 결과 스키마가 더 좁다 — 이 스크립트가 실제로 읽는 필드만 주장한다 (citedChunks 있는 run 전용)
type StoredAnswer = Pick<
  QuestionResult,
  'id' | 'language' | 'systemAnswerable' | 'answer' | 'citedChunks'
>;

/**
 * Judge 판정 분산 실측.
 *
 * 저장된 run의 동일 답변을 같은 Judge(config의 JUDGE_MODEL)로 N회 재채점해,
 * 문항별 판정이 얼마나 흔들리는지 정량화한다 — 판정 분산의 실제 크기를 재야
 * 단일 run 간 judge metric 차이가 의미 있는지 판단할 수 있다.
 *
 * 사용법: tsx scripts/judge-variance.ts <run디렉토리> [반복횟수=3]
 */

const GOLDSET_PATH = path.resolve(import.meta.dirname, '../eval/goldset.jsonl');

async function main() {
  const runDir = process.argv[2];
  const repeats = Number(process.argv[3] ?? '3');
  if (runDir === undefined)
    throw new Error('사용법: tsx scripts/judge-variance.ts <run디렉토리> [반복=3]');
  // 반복 0회는 "분산 없음"이라는 정반대 결론으로 위장되므로 여기서 막는다
  if (!Number.isInteger(repeats) || repeats < 1)
    throw new Error(`반복 횟수가 잘못되었습니다: ${process.argv[3]}`);

  const config = loadConfig();
  const llm = createOpenAiCompatibleClient(clientConfigOf(config));
  const judgeDeps: JudgeDeps = { llm, judgeModel: config.JUDGE_MODEL };

  const goldset = new Map((await loadGoldset(GOLDSET_PATH)).map((g) => [g.id, g]));
  const results = JSON.parse(await readFile(path.join(runDir, 'results.json'), 'utf-8'))
    .results as StoredAnswer[];

  // 원 run의 judge 호출 조건(비-거부 유형 & 시스템이 답변함) ∩ 주집계 대상(en).
  // ko도 원 run에서는 judge되지만, en 헤드라인과 분모가 달라 분산 측정에서는 제외한다.
  const targets = results.flatMap((r) => {
    const g = goldset.get(r.id);
    if (g === undefined || r.language !== 'en') return [];
    if (expectsRefusal(g.type)) return [];
    if (!r.systemAnswerable) return []; // false refusal은 원 run에서도 결정적 0 (judge 미호출)
    return [{ r, g }];
  });

  console.log(
    `Judge 분산 — judge=${config.JUDGE_MODEL}, 문항 ${targets.length}, 반복 ${repeats}회\n`,
  );

  // 불변식: corrRuns[i][j]와 faithRuns[i][j]는 targets[j] 문항의 i번째 반복 판정 —
  // 아래 루프가 targets 순서대로 조건 없이 정확히 1회씩 push하므로 인덱스가 정합한다
  const corrRuns: number[][] = [];
  const faithRuns: number[][] = [];
  for (let i = 0; i < repeats; i += 1) {
    const corr: number[] = [];
    const faith: number[] = [];
    for (const { r, g } of targets) {
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

  const flip = (runs: number[][]) => {
    const flipped: string[] = [];
    targets.forEach((t, j) => {
      const vals = runs.map((run) => run[j]);
      if (new Set(vals).size > 1) flipped.push(`${t.r.id}(${vals.join('/')})`);
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
