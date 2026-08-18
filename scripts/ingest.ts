import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { clientConfigOf, loadConfig } from '../src/config.js';
import { createPool, deleteStaleChunks, existingChunkIds, upsertChunks } from '../src/db.js';
import { type Chunk, chunkDocument } from '../src/ingest/chunker.js';
import { cleanMdx } from '../src/ingest/mdx-clean.js';
import { createOpenAiCompatibleClient } from '../src/llm/client.js';

const CORPUS_ROOT = path.resolve(import.meta.dirname, '../data/corpus');
const CORPUS_DIRS = ['learn', 'reference/react'];
const EMBED_BATCH_SIZE = 32;

function chunkUrl(chunk: Chunk): string {
  const route = chunk.docPath.replace(/\.md$/, '');
  const anchor = chunk.anchor === null ? '' : `#${chunk.anchor}`;
  return `https://react.dev/${route}${anchor}`;
}

async function main() {
  const config = loadConfig();
  const pool = createPool(config.DATABASE_URL);
  const llm = createOpenAiCompatibleClient(clientConfigOf(config));

  const allChunks: Chunk[] = [];
  for (const dir of CORPUS_DIRS) {
    const files = (await readdir(path.join(CORPUS_ROOT, dir))).filter((f) => f.endsWith('.md'));
    for (const file of files.sort()) {
      const docPath = `${dir}/${file}`;
      const raw = await readFile(path.join(CORPUS_ROOT, docPath), 'utf-8');
      const { title, body } = cleanMdx(raw);
      allChunks.push(...chunkDocument(docPath, title, body));
    }
  }
  console.log(
    `청킹 완료: 문서 ${new Set(allChunks.map((c) => c.docPath)).size}개 → 청크 ${allChunks.length}개`,
  );

  // 내용 해시 ID 기반 증분 임베딩: 이미 인덱싱된 청크는 건너뛴다
  const existing = await existingChunkIds(pool);
  const newChunks = allChunks.filter((chunk) => !existing.has(chunk.id));
  console.log(`신규 청크 ${newChunks.length}개 임베딩 시작 (기존 ${existing.size}개 스킵)`);

  for (let i = 0; i < newChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = newChunks.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await llm.embed(
      config.EMBEDDING_MODEL,
      batch.map((chunk) => chunk.content),
    );
    await upsertChunks(pool, batch, embeddings, chunkUrl);
    console.log(`  ${Math.min(i + EMBED_BATCH_SIZE, newChunks.length)}/${newChunks.length}`);
  }

  const staleCount = await deleteStaleChunks(
    pool,
    allChunks.map((chunk) => chunk.id),
  );
  if (staleCount > 0) console.log(`stale 청크 ${staleCount}개 제거`);

  console.log('인덱싱 완료');
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
