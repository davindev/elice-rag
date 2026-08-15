export interface CleanedDoc {
  title: string;
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;

/**
 * react.dev의 MDX 문서를 검색용 마크다운으로 정리한다.
 *
 * - frontmatter에서 title을 추출하고 본문에서 제거
 * - <Sandpack> 블록 제거: 멀티파일 실행 데모(App.js, css, package.json)로
 *   답변 근거 밀도가 낮고 청크를 비대하게 만든다. 설명용 코드는 일반 코드 펜스로
 *   본문에 남아 있으므로 정보 손실이 제한적이다.
 * - 그 외 MDX 컴포넌트(<Intro>, <Note>, <Pitfall> 등)는 태그만 제거하고 내용 유지
 * - heading의 앵커 주석은 citation URL 구성에 필요하므로 여기서 제거하지 않는다
 *   (chunker가 앵커를 추출한 뒤 본문에서 제거)
 */
export function cleanMdx(raw: string): CleanedDoc {
  let body = raw;
  let title = '';

  const fm = FRONTMATTER_RE.exec(body);
  if (fm?.[1]) {
    const titleLine = fm[1].split('\n').find((line) => line.startsWith('title:'));
    title =
      titleLine
        ?.slice('title:'.length)
        .trim()
        .replace(/^['"]|['"]$/g, '') ?? '';
    body = body.slice(fm[0].length);
  }

  body = body.replace(/<Sandpack[^>]*>[\s\S]*?<\/Sandpack>/g, '');
  // 남은 컴포넌트 태그(여는/닫는/self-closing)를 제거하고 내용은 유지
  body = body.replace(/^[ \t]*<\/?[A-Z][A-Za-z]*(\s[^>]*)?\/?>[ \t]*$/gm, '');
  body = body.replace(/<[A-Z][A-Za-z]*(\s[^>]*)?\/>/g, '');

  // 연속 빈 줄 정리
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  return { title, body };
}
