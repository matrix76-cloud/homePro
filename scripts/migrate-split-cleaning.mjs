// 옛 '전문청소(professional_cleaning)'를 입주 · 특수 · 사업장청소로 옮긴다 (대표 리뷰 11/03).
// 정기청소는 원래 따로 있던 카테고리라 그대로다.
//
//   node scripts/migrate-split-cleaning.mjs          — 바꿀 것만 보여준다 (기본)
//   node scripts/migrate-split-cleaning.mjs --apply  — 실제로 바꾼다
//
// 오더: 첫 세부 항목의 서비스(홈클리닝 · 특수청소 …)로 새 카테고리를 정한다.
// 전문분야(homepro_pros): 세부 분야가 비어 있으면 전문청소 전체를 하던 것이라 세 카테고리에 모두 복사한다.
//   고른 세부 분야가 있으면 그 분야가 속한 카테고리에만 복사한다. 옛 문서는 지운다.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'fs'

const APPLY = process.argv.includes('--apply')
const key = JSON.parse(fs.readFileSync('/Users/a1111/Downloads/2026Dev/mainproject/2026Web/homePro/_migration/keys/target-homepro-nexlabs.json', 'utf8'))
initializeApp({ credential: cert(key) })
const db = getFirestore()

const OLD = 'professional_cleaning'
const NAME = { move_cleaning: '입주청소', special_cleaning: '특수청소', business_cleaning: '사업장청소' }
const SERVICE_TO_CAT = {
  '홈클리닝': 'move_cleaning',
  '특수청소': 'special_cleaning',
  '화재청소': 'special_cleaning',
  '상업.매장청소': 'business_cleaning',
  '바닥청소': 'business_cleaning',
  '바닥 전문청소': 'business_cleaning',
  '준공청소': 'business_cleaning',
  '외벽.고소청소': 'business_cleaning',
}
const SUB_RENAME = { '바닥청소': '바닥 전문청소' }
const catOfSub = (s = '') => {
  const svc = Object.keys(SERVICE_TO_CAT).sort((a, b) => b.length - a.length).find((k) => s === k || s.startsWith(k + ' '))
  return svc ? SERVICE_TO_CAT[svc] : null
}

// ── 오더 ──
const orders = await db.collection('homepro_orders').where('categoryId', '==', OLD).get()
console.log(`오더 ${orders.size}건`)
for (const d of orders.docs) {
  const x = d.data()
  const subs = x.subcategories || (x.subcategory ? [x.subcategory] : [])
  const to = subs.map(catOfSub).find(Boolean) || 'move_cleaning'
  const patch = { categoryId: to, categoryName: NAME[to], migratedFrom: OLD }
  if (typeof x.title === 'string' && x.title.startsWith('전문청소')) patch.title = NAME[to] + x.title.slice('전문청소'.length)
  console.log(`  ${d.id}  ${subs.join(' / ') || '(세부 없음)'}  →  ${to}${patch.title ? '  제목: ' + patch.title : ''}`)
  if (APPLY) await d.ref.update(patch)
}

// ── 전문분야 ──
const pros = await db.collection('homepro_pros').where('categoryId', '==', OLD).get()
console.log(`전문분야 ${pros.size}건`)
for (const d of pros.docs) {
  const x = d.data()
  const subs = x.detail?.subcategories || []
  const targets = subs.length ? [...new Set(subs.map((s) => SERVICE_TO_CAT[s]).filter(Boolean))] : Object.keys(NAME)
  if (!targets.length) targets.push(...Object.keys(NAME))
  for (const to of targets) {
    const id = `${x.uid}_${to}`
    const exists = (await db.collection('homepro_pros').doc(id).get()).exists
    const mySubs = subs.filter((s) => SERVICE_TO_CAT[s] === to).map((s) => SUB_RENAME[s] || s)
    console.log(`  ${d.id}  →  ${id}${exists ? '  (이미 있어 건너뜀)' : ''}  세부: ${mySubs.join(', ') || '없음'}`)
    if (APPLY && !exists) {
      await db.collection('homepro_pros').doc(id).set({ ...x, categoryId: to, detail: { ...(x.detail || {}), subcategories: mySubs }, migratedFrom: OLD })
    }
  }
  if (APPLY) await d.ref.delete()
}
console.log(APPLY ? '적용 끝' : '미리보기만 — 바꾸려면 --apply')
