import path from 'node:path';
import { clientConfigOf, loadConfig } from '../src/config.js';
import { createPool, searchDense } from '../src/db.js';
import { loadGoldset, REFUSAL_TYPES } from '../src/eval/goldset.js';
import { createOpenAiCompatibleClient } from '../src/llm/client.js';

/**
 * RETRIEVAL_MIN_SCORE 데이터 튜닝 (한계점 "threshold 미튜닝" 해소).
 *
 * answerable / unanswerable(+injection) 문항의 dense top-1 코사인 유사도 분포를
 * 실측해, 두 분포를 가르는 threshold 후보를 제안하고 그 값에서의
 * abstention / false refusal을 시뮬레이션한다. LLM 생성·judge 없이 검색만 사용.
 */
const GOLDSET_PATH = path.resolve(import.meta.dirname, '../eval/goldset.jsonl');
const refusalTypes = new Set<string>(REFUSAL_TYPES);

async function main() {
  const config = loadConfig();
  const llm = createOpenAiCompatibleClient(clientConfigOf(config));
  const pool = createPool(config.DATABASE_URL);
  const goldset = await loadGoldset(GOLDSET_PATH);

  // en 문항만 (ko는 cross-lingual이라 점수 스케일이 달라 threshold를 오염시킴)
  const rows = goldset.filter((g) => g.language === 'en');
  const scored: { id: string; type: string; refusalExpected: boolean; top1: number }[] = [];

  for (const g of rows) {
    const vecs = await llm.embed(config.EMBEDDING_MODEL, [g.question]);
    const vec = vecs[0];
    if (vec === undefined) throw new Error(`임베딩 실패: ${g.id}`);
    const hits = await searchDense(pool, vec, config.TOP_K);
    scored.push({
      id: g.id,
      type: g.type,
      refusalExpected: refusalTypes.has(g.type),
      top1: hits[0]?.score ?? 0,
    });
  }
  await pool.end();

  const ans = scored.filter((s) => !s.refusalExpected).map((s) => s.top1);
  const ref = scored.filter((s) => s.refusalExpected).map((s) => s.top1);
  const fmt = (xs: number[]) =>
    `n=${xs.length} min=${Math.min(...xs).toFixed(3)} max=${Math.max(...xs).toFixed(3)} mean=${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3)}`;

  console.log('=== dense top-1 코사인 유사도 분포 (en) ===');
  console.log('answerable   ', fmt(ans));
  console.log('unanswerable ', fmt(ref));
  console.log(
    `\n분리 여부: answerable 최소 ${Math.min(...ans).toFixed(3)} vs unanswerable 최대 ${Math.max(...ref).toFixed(3)}`,
  );

  // 후보 threshold를 촘촘히 훑어 answerable을 최대한 살리며 unanswerable을 거르는 지점 탐색
  console.log('\n=== threshold 후보별 시뮬레이션 (top-1 < threshold면 거부) ===');
  console.log('thr    | abstention(거부맞음) | falseRefusal(오거부) | 순정확');
  const candidates: number[] = [];
  for (let t = 0.2; t <= 0.65; t += 0.025) candidates.push(Number(t.toFixed(3)));
  for (const thr of candidates) {
    const abstain = ref.filter((s) => s < thr).length / ref.length; // 거부 기대인데 실제 거부
    const falseRef = ans.filter((s) => s < thr).length / ans.length; // 답변 기대인데 거부
    const net = (abstain * ref.length + (1 - falseRef) * ans.length) / (ref.length + ans.length);
    console.log(
      `${thr.toFixed(3)} | ${abstain.toFixed(3)} (${ref.filter((s) => s < thr).length}/${ref.length})        | ${falseRef.toFixed(3)} (${ans.filter((s) => s < thr).length}/${ans.length})        | ${net.toFixed(3)}`,
    );
  }

  console.log('\n=== unanswerable 문항별 top-1 (거르기 어려운 순) ===');
  scored
    .filter((s) => s.refusalExpected)
    .sort((a, b) => b.top1 - a.top1)
    .forEach((s) => console.log(`  ${s.id} [${s.type}] top1=${s.top1.toFixed(3)}`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
