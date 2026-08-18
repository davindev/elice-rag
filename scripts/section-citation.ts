import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { createPool } from '../src/db.js';
import { loadGoldset } from '../src/eval/goldset.js';

/**
 * 섹션(anchor) 단위 Citation Precision 측정 (Next Steps).
 *
 * 문서 단위 citP는 "같은 문서의 엉뚱한 섹션 인용"을 잡지 못한다(문서의 맹점).
 * 인용한 청크의 섹션 앵커가 expectedAnchors(정당한 섹션)에 속하는지로
 * 섹션 단위 정밀도를 계산한다 — Anchor Recall(검색)의 인용판. LLM 불개입.
 *
 * 매칭은 프로젝트 표준(anchorRecallAtK)과 동일하게 청크의 `anchors[]` 전체를 본다.
 * url은 병합 청크의 첫 앵커만 담으므로(ingest의 chunkUrl), chunkId로 DB의
 * anchors[]를 조회해 매칭한다.
 *
 * expectedAnchors는 필수 섹션만이라, 앵커 밖 인용이 곧 오인용은 아니다(실험 4의 교훈).
 * 따라서 "앵커 밖 인용" 문항을 감사 대상으로 함께 출력한다.
 *
 * 사용법: tsx scripts/section-citation.ts <run디렉토리>
 */
const GOLDSET_PATH = path.resolve(import.meta.dirname, '../eval/goldset.jsonl');

async function main() {
  const runDir = process.argv[2];
  if (runDir === undefined)
    throw new Error('사용법: tsx scripts/section-citation.ts <run디렉토리>');

  const goldset = new Map((await loadGoldset(GOLDSET_PATH)).map((g) => [g.id, g]));
  const results = JSON.parse(await readFile(path.join(runDir, 'results.json'), 'utf-8'))
    .results as Array<{
    id: string;
    language: string;
    citedChunks: { chunkId: string; docPath: string }[];
  }>;

  // 인용된 청크의 anchors[]를 DB에서 조회 (표준 anchorRecallAtK와 동일 기준)
  const config = loadConfig();
  const pool = createPool(config.DATABASE_URL);
  const chunkIds = [...new Set(results.flatMap((r) => r.citedChunks.map((c) => c.chunkId)))];
  const { rows } = await pool.query<{ id: string; doc_path: string; anchors: string[] }>(
    'SELECT id, doc_path, anchors FROM chunks WHERE id = ANY($1)',
    [chunkIds],
  );
  await pool.end();
  const byId = new Map(rows.map((r) => [r.id, { docPath: r.doc_path, anchors: r.anchors }]));

  let citedTotal = 0;
  let citedInAnchor = 0;
  const outOfAnchor: { id: string; docPath: string; anchors: string[] }[] = [];
  const missing: string[] = [];

  for (const r of results) {
    const g = goldset.get(r.id);
    if (g === undefined || r.language !== 'en') continue;
    if (g.expectedAnchors === undefined || g.expectedAnchors.length === 0) continue; // 앵커 라벨 문항만
    // 정당한 섹션 = 필수(expectedAnchors) ∪ 감사로 승격된 정당 섹션(acceptableAnchors)
    const anchors = [...g.expectedAnchors, ...(g.acceptableAnchors ?? [])];
    // 정당 근거 문서 — anchor 없는 도입부 청크(정의 요약)를 doc-level로 인정하기 위함
    const legitDocs = new Set([...g.expectedEvidence, ...(g.acceptableEvidence ?? [])]);

    for (const c of r.citedChunks) {
      const info = byId.get(c.chunkId);
      if (info === undefined) {
        missing.push(c.chunkId); // 인덱스 불일치 — 품질과 무관하므로 분모에서 제외
        continue;
      }
      citedTotal++;
      // anchor 없는 도입부 청크는 섹션 식별자가 없어 섹션 매칭 불가 → 정당 근거 문서면 doc-level로 인정
      const legit =
        info.anchors.length === 0
          ? legitDocs.has(info.docPath)
          : anchors.some((e) => e.doc === info.docPath && info.anchors.includes(e.anchor));
      if (legit) citedInAnchor++;
      else outOfAnchor.push({ id: r.id, docPath: info.docPath, anchors: info.anchors });
    }
  }

  const citP = citedTotal === 0 ? Number.NaN : citedInAnchor / citedTotal;
  console.log(`run: ${path.basename(runDir)}`);
  console.log(
    `섹션 단위 Citation Precision (앵커 라벨 문항, en): ${citP.toFixed(3)} (${citedInAnchor}/${citedTotal})`,
  );
  if (missing.length > 0)
    console.log(`⚠️ DB에 없는 chunkId ${missing.length}개 (인덱스 불일치 가능)`);
  console.log('\n=== 앵커 밖 인용 (감사 대상 — 실제 오인용? acceptable 섹션?) ===');
  for (const o of outOfAnchor) console.log(`  ${o.id}: ${o.docPath} [${o.anchors.join(', ')}]`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
