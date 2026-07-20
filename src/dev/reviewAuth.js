// 리뷰 허브 전용 데모 로그인 — 시드 계정 커스텀 토큰(getSeedLoginToken)으로 iframe을 로그인 상태로.
// SeedLoginPage.js와 동일 방식(uid + secret). URL은 localStorage override 우선.
import { signInWithCustomToken, signOut } from 'firebase/auth'
import { auth } from '../api/config'

const SECRET = 'homepro-seed-2026-x9k3p'
const DEFAULT_FN_URL = 'https://asia-northeast3-homepro-43f7f.cloudfunctions.net/getSeedLoginToken'
const FN_URL_KEY = 'homepro.seedLoginFnUrl' // SeedLoginPage와 공유 — 형이 거기서 저장해둔 URL 재사용
const ACCT_KEY = 'review.demoAcct'

export const ANON = '__anon__' // 로그인 안 함(인증 화면용)

// SeedLoginPage.js ACCOUNTS와 동일
export const SEED_ACCOUNTS = [
  { uid: 'seed_A1', nickname: '성실한청소부', role: '의뢰자', region: '서울 강남구' },
  { uid: 'seed_A2', nickname: '부지런한사장', role: '의뢰자', region: '부산 해운대구' },
  { uid: 'seed_A3', nickname: '똑똑한대표', role: '의뢰자', region: '대전 서구' },
  { uid: 'seed_A4', nickname: '친절한매니저', role: '의뢰자', region: '충남 논산시' },
  { uid: 'seed_A5', nickname: '빠른오너', role: '의뢰자', region: '충북 청주 상당구' },
  { uid: 'seed_B1', nickname: '용감한강아지', role: '홈프로', region: '서울 마포구' },
  { uid: 'seed_B2', nickname: '든든한기술자', role: '홈프로', region: '서울 강서구' },
  { uid: 'seed_B3', nickname: '노련한장인', role: '홈프로', region: '광주 광산구' },
  { uid: 'seed_B4', nickname: '정직한작업자', role: '홈프로 (지정배정)', region: '경기 수원 영통' },
  { uid: 'seed_B5', nickname: '성실프로A', role: '홈프로(지원자풀)', region: '서울 송파구' },
  { uid: 'seed_B6', nickname: '성실프로B', role: '홈프로(지원자풀)', region: '부산 부산진구' },
  { uid: 'seed_B7', nickname: '성실프로C', role: '홈프로(지원자풀)', region: '대구 수성구' },
  { uid: 'seed_B8', nickname: '성실프로D', role: '홈프로(지원자풀)', region: '인천 남동구' },
  { uid: 'seed_B9', nickname: '성실프로E', role: '홈프로(지원자풀)', region: '울산 남구' },
]

export const DEFAULT_ACCT = 'seed_B1' // 기본 데모 계정(홈프로)
export const acctLabel = (uid) => {
  if (uid === ANON) return '로그인 안 함'
  const a = SEED_ACCOUNTS.find((x) => x.uid === uid)
  return a ? `${a.nickname} · ${a.role} · ${a.region}` : uid
}

export const getSavedAcct = () => localStorage.getItem(ACCT_KEY) || DEFAULT_ACCT
export const saveAcct = (uid) => localStorage.setItem(ACCT_KEY, uid)

const fnUrl = () => (localStorage.getItem(FN_URL_KEY) || DEFAULT_FN_URL).replace(/\/$/, '')

// 시드 계정으로 로그인(커스텀 토큰). onAuthStateChanged가 반영.
export async function loginAsSeed(uid) {
  const url = `${fnUrl()}?uid=${encodeURIComponent(uid)}&secret=${SECRET}`
  const r = await fetch(url)
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.token) throw new Error(j.error || `토큰 발급 실패(${r.status})`)
  await signInWithCustomToken(auth, j.token)
}

export async function logoutReview() {
  await signOut(auth)
}

// 관리자 화면(admin 도메인)용 — RequireAdmin은 adminSession 존재만 확인하므로 더미 세션이면 통과.
export function ensureAdminSession() {
  if (localStorage.getItem('adminSession')) return false
  localStorage.setItem('adminSession', JSON.stringify({
    id: 'demo-admin', loginId: 'demo', name: '데모관리자', rank: 'superadmin',
    loggedInAt: new Date().toISOString(), demo: true,
  }))
  return true
}
