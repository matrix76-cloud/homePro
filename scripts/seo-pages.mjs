// 빌드 뒤(postbuild) 검색용 페이지별 index.html 을 만든다 — 서치콘솔 "색인 생성되지 않음" 대응 (2026-10-27)
// 앱은 SPA 라 모든 주소가 같은 index.html(canonical = 루트)을 받아, 구글이 /app · /legal/* 를 루트의 사본으로 보고 색인하지 않았다.
// 사이트맵에 올린 주소마다 build/<경로>/index.html 을 두고 canonical · og:url · 제목 · 설명을 그 페이지 것으로 바꾼다.
// firebase.json 의 "trailingSlash": false 와 짝 — /app 요청에 app/index.html 이 슬래시 없이 나간다.
import fs from 'fs'
import path from 'path'

const BASE = 'https://www.tryhomepro.com'
const BUILD = path.resolve('build')

// canonical 이 자기 자신이 아닌 페이지(/intro → /)는 사이트맵에 넣지 않는다
const PAGES = [
  { p: '/intro', canonical: '/' },
  { p: '/app', title: '홈프로 앱 다운로드 | 윈플래닛', desc: '홈프로 앱을 안드로이드(플레이스토어)와 아이폰(앱스토어)에서 받으세요. 집 전문가들이 오더를 공유하고 소개수수료로 수익을 만드는 플랫폼입니다.' },
  { p: '/legal/terms', title: '서비스 이용약관 | 홈프로', desc: '홈프로(운영 윈플래닛) 서비스 이용약관입니다.' },
  { p: '/legal/privacy', title: '개인정보 처리방침 | 홈프로', desc: '홈프로(운영 윈플래닛) 개인정보 처리방침입니다.' },
  { p: '/legal/location', title: '위치기반서비스 이용약관 | 홈프로', desc: '홈프로(운영 윈플래닛) 위치기반서비스 이용약관입니다.' },
  { p: '/legal/delete-account', title: '계정 삭제 안내 | 홈프로', desc: '홈프로 계정과 데이터를 삭제하는 방법을 안내합니다.' },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const src = fs.readFileSync(path.join(BUILD, 'index.html'), 'utf8')

for (const pg of PAGES) {
  const url = BASE + (pg.canonical ?? pg.p)
  let html = src
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}"/>`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}"/>`)
  if (pg.title) {
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(pg.title)}</title>`)
      .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(pg.title)}"/>`)
  }
  if (pg.desc) {
    html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(pg.desc)}"/>`)
  }
  if (!html.includes(`href="${url}"`)) throw new Error(`canonical 치환 실패: ${pg.p}`)
  const out = path.join(BUILD, pg.p, 'index.html')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, html)
  console.log('seo page', pg.p, '→', url)
}
