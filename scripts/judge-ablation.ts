import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { clientConfigOf, loadConfig } from '../src/config.js';
import { loadGoldset } from '../src/eval/goldset.js';
import { type JudgeDeps, judgeCorrectness, judgeFaithfulness } from '../src/eval/judge.js';
import { mean } from '../src/eval/metrics.js';
import { createOpenAiCompatibleClient } from '../src/llm/client.js';

/**
 * Judge ablation (실험 8).
 *
 * 동일 run의 **저장된 답변**을 서로 다른 Judge 모델로 재채점한다.
 * 답변을 재생성하지 않으므로 변인이 Judge 모델 하나로 완전히 격리된다 —
 * "같은 답변을 Judge가 얼마나 다르게 매기는가"를 순수 측정.
 *
 * 사용법: tsx scripts/judge-ablation.ts <run디렉토리> <judgeModel>
 */
const GOLDSET_PATH = path.resolve(import.meta.dirname, '../eval/goldset.jsonl');

async function main() {
  const runDir = process.argv[2];
  const judgeModel = process.argv[3];
  if (runDir === undefined || judgeModel === undefined) {
    throw new Error('사용법: tsx scripts/judge-ablation.ts <run디렉토리> <judgeModel>');
  }

  const config = loadConfig();
  const clientConfig = clientConfigOf(config);
  // ablation judge가 config의 세 역할 모델과 다르면 그 endpoint를 환경변수에서 보강한다.
  // ABLATION_JUDGE_BASE_URL 형식으로 지정 (예시는 실행 커맨드 참고)
  const extraBaseUrl = process.env.ABLATION_JUDGE_BASE_URL;
  const endpoints =
    extraBaseUrl === undefined
      ? clientConfig.endpoints
      : { ...clientConfig.endpoints, [judgeModel]: extraBaseUrl };
  const llm = createOpenAiCompatibleClient({ ...clientConfig, endpoints });
  const judgeDeps: JudgeDeps = { llm, judgeModel };

  const goldset = new Map((await loadGoldset(GOLDSET_PATH)).map((g) => [g.id, g]));
  const results = JSON.parse(await readFile(path.join(runDir, 'results.json'), 'utf-8'), (_, v) =>
    v === null ? Number.NaN : v,
  ).results as Array<{
    id: string;
    language: string;
    type: string;
    question: string;
    systemAnswerable: boolean;
    answer: string;
    citedChunks: { index: number; content: string }[];
  }>;

  console.log(`Judge ablation — run: ${path.basename(runDir)}, judge: ${judgeModel}\n`);

  const corr: number[] = [];
  const faith: number[] = [];
  const perItem: { id: string; correctness: number; faithfulness: number }[] = [];

  for (const r of results) {
    // 원 run에서 judge를 호출했던 조건 그대로 재현: en answerable 문항만
    const g = goldset.get(r.id);
    if (g === undefined || r.language !== 'en') continue;
    if (g.type === 'unanswerable' || g.type === 'injection') continue;
    if (!r.systemAnswerable) continue; // false refusal은 원 run에서도 결정적 0 (judge 미호출)

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
    perItem.push({ id: r.id, correctness: c.score, faithfulness: f.score });
  }

  console.log(`판정 문항: ${corr.length}개`);
  console.log(`Correctness  ${mean(corr).toFixed(3)}`);
  console.log(`Faithfulness ${mean(faith).toFixed(3)}`);
  console.log('\n문항별:', JSON.stringify(perItem));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
