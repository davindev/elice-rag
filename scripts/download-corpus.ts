import { spawn } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { CORPUS_PINNED_SHA } from '../src/corpus-version.js';

/**
 * reactjs/react.dev 레포에서 corpus를 다운로드한다.
 * 커밋 SHA를 고정해 언제 실행해도 동일한 corpus가 재현된다.
 */
const TARBALL_URL = `https://codeload.github.com/reactjs/react.dev/tar.gz/${CORPUS_PINNED_SHA}`;
const PREFIX = `react.dev-${CORPUS_PINNED_SHA}`;
const CORPUS_DIRS = ['src/content/learn', 'src/content/reference/react'];
const DEST = path.resolve(import.meta.dirname, '../data/corpus');

async function main() {
  await rm(DEST, { recursive: true, force: true });
  await mkdir(DEST, { recursive: true });

  const response = await fetch(TARBALL_URL);
  if (!response.ok || response.body === null) {
    throw new Error(`tarball 다운로드 실패: ${response.status} ${response.statusText}`);
  }

  // --strip-components=3: react.dev-{SHA}/src/content/ 프리픽스를 제거해
  // data/corpus/learn/*.md, data/corpus/reference/react/*.md 구조로 추출
  const tar = spawn(
    'tar',
    ['-xz', '--strip-components=3', '-C', DEST, ...CORPUS_DIRS.map((dir) => `${PREFIX}/${dir}`)],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise<void>((resolve, reject) => {
    tar.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`tar 종료 코드 ${code}`)),
    );
  });
  await pipeline(Readable.fromWeb(response.body), tar.stdin);
  await done;

  const learn = (await readdir(path.join(DEST, 'learn'))).filter((f) => f.endsWith('.md'));
  const reference = (await readdir(path.join(DEST, 'reference/react'))).filter((f) =>
    f.endsWith('.md'),
  );
  console.log(`corpus 다운로드 완료 (SHA ${CORPUS_PINNED_SHA.slice(0, 7)})`);
  console.log(`  learn: ${learn.length}개, reference/react: ${reference.length}개`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
