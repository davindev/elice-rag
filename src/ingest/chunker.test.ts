import { describe, expect, it } from 'vitest';
import { chunkDocument } from './chunker.js';
import { cleanMdx } from './mdx-clean.js';

const DOC = `## Reference {/*reference*/}

### \`useState(initialState)\` {/*usestate*/}

Call useState at the top level of your component.

#### Parameters {/*parameters*/}

initialState: The value you want the state to be initially.

## Usage {/*usage*/}

Some usage text.
`;

describe('chunkDocument', () => {
  it('heading breadcrumb과 앵커를 보존한다', () => {
    const chunks = chunkDocument('reference/react/useState.md', 'useState', DOC);
    expect(chunks.length).toBeGreaterThan(0);
    const first = chunks[0];
    expect(first?.headingPath[0]).toBe('useState');
    expect(first?.anchor).toBe('reference');
    for (const chunk of chunks) {
      expect(chunk.headingPath[0]).toBe('useState');
    }
  });

  it('같은 h2 아래 작은 섹션들을 하나의 청크로 병합한다', () => {
    const chunks = chunkDocument('doc.md', 'Doc', DOC, { maxTokens: 500 });
    // Reference h2 아래 3개 섹션이 1청크, Usage h2가 별도 1청크
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.content).toContain('Parameters');
    expect(chunks[1]?.content).toContain('Usage');
  });

  it('h2가 바뀌면 병합하지 않는다', () => {
    const chunks = chunkDocument('doc.md', 'Doc', DOC, { maxTokens: 500 });
    expect(chunks[0]?.content).not.toContain('Some usage text');
  });

  it('maxTokens 초과 섹션을 문단 경계에서 분할하고 overlap을 포함한다', () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => `Paragraph ${i} ${'word '.repeat(30)}`);
    const body = `## Big {/*big*/}\n\n${paragraphs.join('\n\n')}`;
    const chunks = chunkDocument('doc.md', 'Doc', body, { maxTokens: 100 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(150); // overlap 포함 여유
    }
    // 이웃 청크는 overlap 문단을 공유한다
    const first = chunks[0]?.content ?? '';
    const second = chunks[1]?.content ?? '';
    const lastParaOfFirst = first.split('\n\n').at(-1) ?? '';
    expect(second).toContain(lastParaOfFirst.slice(0, 20));
  });

  it('코드 펜스 내부의 # 줄을 heading으로 오인하지 않는다', () => {
    const body = '## Code {/*code*/}\n\n```bash\n# not a heading\necho hi\n```\n\ntail text';
    const chunks = chunkDocument('doc.md', 'Doc', body);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toContain('# not a heading');
  });

  it('동일 입력에 대해 결정적 ID를 생성한다', () => {
    const a = chunkDocument('doc.md', 'Doc', DOC);
    const b = chunkDocument('doc.md', 'Doc', DOC);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});

describe('cleanMdx', () => {
  it('frontmatter title을 추출하고 본문에서 제거한다', () => {
    const { title, body } = cleanMdx('---\ntitle: useState\n---\n\nContent here');
    expect(title).toBe('useState');
    expect(body).toBe('Content here');
  });

  it('Sandpack 블록을 통째로 제거한다', () => {
    const raw = 'before\n\n<Sandpack>\n\n```js\ncode\n```\n\n</Sandpack>\n\nafter';
    expect(cleanMdx(raw).body).toBe('before\n\nafter');
  });

  it('래퍼 컴포넌트의 태그만 제거하고 내용은 유지한다', () => {
    const raw = '<Intro>\n\nThe intro text.\n\n</Intro>\n\n<InlineToc />\n\nBody.';
    const { body } = cleanMdx(raw);
    expect(body).toContain('The intro text.');
    expect(body).not.toContain('<Intro>');
    expect(body).not.toContain('InlineToc');
  });
});
