// 공식 초대코드 문서 만들기 — 그랜드 오픈 사전예약 (대표 리뷰 11/22, 팝업의 HOMEPRO2026)
//
// 사용 (프로젝트 맨 위 폴더에서):
//   node scripts/seed-official-code.mjs                 지금 상태만 보여 준다 (쓰지 않음)
//   node scripts/seed-official-code.mjs --write         referral_codes/HOMEPRO2026 을 만든다
//   node scripts/seed-official-code.mjs --write ABC2027 다른 코드로
//   node scripts/seed-official-code.mjs --off           코드를 끈다(active: false → "만료된 코드")
//
// 만들어지는 문서: referral_codes/<코드> { official: true, active: true, uid: null, label, usedCount: 0, createdAt }
//  · official: true 면 ReferralService.applyReferralCode 가 추천인 없이 가입자에게만 referral_signup 포인트를 준다.
//  · 회원 코드(영문 2 + 숫자 6)와 꼴이 달라 겹치지 않는다. 그래도 같은 이름의 '회원 코드' 문서가 이미 있으면 멈춘다.
//  · 팝업에 보이는 코드 글자는 settings/preopenPopup.code (관리자 > 설정 > 정관/약관 관리 > 사전예약 팝업) — 둘을 같게 둔다.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import fs from 'fs'

const args = process.argv.slice(2)
const write = args.includes('--write')
const off = args.includes('--off')
const code = (args.find((a) => !a.startsWith('--')) || 'HOMEPRO2026').trim().toUpperCase()

if (/^[A-Z]{2}\d{6}$/.test(code)) { console.log('회원 코드 꼴(영문 2 + 숫자 6)은 공식 코드로 쓸 수 없습니다:', code); process.exit(1) }

const key = JSON.parse(fs.readFileSync('_migration/keys/target-homepro-nexlabs.json', 'utf8'))
initializeApp({ credential: cert(key) })
const db = getFirestore()
const ref = db.collection('referral_codes').doc(code)
const snap = await ref.get()

console.log('코드:', code)
console.log('지금:', snap.exists ? JSON.stringify(snap.data()) : '(문서 없음)')

if (snap.exists && snap.data().official !== true) {
  console.log('같은 이름의 회원 코드가 이미 있습니다 — 덮어쓰지 않고 멈춥니다.')
  process.exit(1)
}

if (off) {
  if (!snap.exists) { console.log('끌 문서가 없습니다.'); process.exit(0) }
  await ref.set({ active: false, offAt: FieldValue.serverTimestamp() }, { merge: true })
  console.log('껐습니다 (active: false).')
} else if (write) {
  if (snap.exists) {
    await ref.set({ official: true, active: true }, { merge: true })
    console.log('이미 있는 공식 코드 — active: true 로만 맞췄습니다 (usedCount 는 그대로).')
  } else {
    await ref.set({
      official: true,
      active: true,
      uid: null,
      label: '그랜드 오픈 사전예약',
      usedCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    })
    console.log('만들었습니다.')
  }
} else {
  console.log('확인만 했습니다. 만들려면 --write 를 붙이세요.')
}
