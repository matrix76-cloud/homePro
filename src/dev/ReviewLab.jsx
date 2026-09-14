/* eslint-disable */
// 리뷰 페이지 재구축 시안 랩 (/reviewlab) — 형 지시 2026-09-12 "좌=폰만 크게 / 우=탭·게시판·작성칸"
// 0번은 현재 배치. 실제 iframe(오더 등록 화면)·실제 기록(order-create 스레드)로 그린다. 번호로 고르면 된다.
import { useEffect, useState } from 'react'
import { DOMAINS } from './reviewData'
import { subscribeThread } from './reviewThreadService'
import { loginAsSeed, getSavedAcct } from './reviewAuth'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif"
const C = { ink: '#2b3440', ink2: '#3a4351', gray: '#566070', gray2: '#98a2b0', line: '#e6e9ee', bg: '#f7f8fa', card: '#fff' }
const GREEN = '#00C74E'
const BY_STYLE = { 형: { ink: '#2b3440', bg: '#fff', line: '#e6e9ee' }, 대표님: { ink: '#c05621', bg: '#fffaf6', line: '#f5d3c6' }, 카스: { ink: '#3b6ea5', bg: '#f4f8fd', line: '#d3e2f5' } }
const SCREEN_ID = 'order-create'
const SRC = '/order/create'
const domain = DOMAINS.find((d) => d.key === 'order')
const cur = domain.screens.find((s) => s.id === SCREEN_ID)

const CARD = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: '0 1px 2px rgba(20,30,45,0.05), 0 6px 18px rgba(20,30,45,0.04)', display: 'flex', flexDirection: 'column', minHeight: 0 }
const HEAD = { flex: 'none', padding: '14px 18px', background: '#f8fafb', borderBottom: `1px solid ${C.line}`, borderTopLeftRadius: 16, borderTopRightRadius: 16, fontSize: 17, fontWeight: 800 }

/** 폰 프레임 — 폭 W 에 맞춰 390px 모바일 레이아웃을 스케일한다 (앱은 390 기준으로 그려지니 글자도 같이 커진다) */
function Phone({ w, h, scale1 }) {
  const scale = scale1 ? 1 : w / 390
  const innerH = Math.round(h / scale)
  return (
    <div style={{ width: w, height: h, borderRadius: 24, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', background: '#fff', flex: 'none' }}>
      <div style={{ width: 390, height: innerH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <iframe title="폰" src={SRC} style={{ width: 390, height: innerH, border: 'none' }} />
      </div>
    </div>
  )
}

function DomainTabs({ small }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {DOMAINS.map((d) => {
        const on = d.key === 'order'
        return <button key={d.key} style={{ fontSize: small ? 15 : 16, fontWeight: 800, padding: small ? '4px 10px' : '6px 14px', borderRadius: 8, border: `1px solid ${on ? C.ink : C.line}`, background: on ? C.ink : '#fff', color: on ? '#fff' : C.ink2, cursor: 'pointer', fontFamily: FONT }}>{d.label} <span style={{ fontWeight: 600, opacity: 0.7 }}>{d.screens.length}</span></button>
      })}
    </div>
  )
}
function ScreenChips({ vertical }) {
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', flexWrap: vertical ? 'nowrap' : 'wrap', gap: 6 }}>
      {domain.screens.map((r) => {
        const on = r.id === SCREEN_ID
        return <button key={r.id} style={{ textAlign: 'left', fontSize: 15, fontWeight: 700, padding: vertical ? '8px 12px' : '4px 10px', borderRadius: vertical ? 8 : 14, border: `1px solid ${on ? C.ink : C.line}`, background: on ? C.ink : '#fff', color: on ? '#fff' : C.gray, cursor: 'pointer', fontFamily: FONT, whiteSpace: vertical ? 'normal' : 'nowrap' }}>{r.no} {r.name}</button>
      })}
    </div>
  )
}
function TitleRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.gray }}>{cur.no}</span>
      <b style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.3px' }}>{cur.name}</b>
      <span style={{ fontSize: 15, color: C.gray2, fontFamily: 'ui-monospace, monospace' }}>{cur.path}</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 15, color: C.gray, fontWeight: 700 }}>iframe 계정</span>
      <select style={{ fontSize: 15, padding: '5px 9px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', fontFamily: FONT }}><option>용감한강아지 · 메인 · 서울 마포구</option></select>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>로그인됨</span>
    </div>
  )
}
function Entry({ e, reply }) {
  const st = BY_STYLE[e.by] || BY_STYLE['형']
  return (
    <div style={{ marginLeft: reply ? 22 : 0, padding: '10px 13px', borderRadius: 10, border: `1px solid ${st.line}`, background: st.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {reply && <span style={{ color: C.gray2, fontSize: 16 }}>↳</span>}
        <b style={{ fontSize: 15, color: st.ink }}>{e.by}</b>
        <span style={{ fontSize: 14, color: C.gray2 }}>{e.at}</span>
      </div>
      {e.text && <div style={{ fontSize: 16, lineHeight: 1.55, color: C.ink2, whiteSpace: 'pre-line' }}>{e.text}</div>}
      {e.imgs?.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>{e.imgs.map((s, k) => <img key={k} src={s} alt="" style={{ maxWidth: 200, maxHeight: 140, borderRadius: 6, border: `1px solid ${C.line}`, objectFit: 'cover' }} />)}</div>}
    </div>
  )
}
function Thread({ entries, style }) {
  return (
    <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      {entries.filter((e) => !e.replyTo).flatMap((root) => [
        <Entry key={root.pid} e={root} />,
        ...entries.filter((c) => c.replyTo === root.pid).map((c) => <Entry key={c.pid} e={c} reply />),
      ])}
    </div>
  )
}
function Composer({ tall }) {
  return (
    <div style={{ flex: 'none', borderTop: `1px solid ${C.line}`, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 15, color: C.gray, fontWeight: 700 }}>작성자</span>
        {['형', '대표님'].map((a, i) => <span key={a} style={{ fontSize: 15, fontWeight: 700, padding: '4px 12px', borderRadius: 14, border: `1px solid ${i === 0 ? C.ink : C.line}`, background: i === 0 ? C.ink : '#fff', color: i === 0 ? '#fff' : C.gray }}>{a}</span>)}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 15, fontWeight: 700, padding: '4px 12px', borderRadius: 14, border: `1px solid ${C.line}`, background: '#fff', color: C.gray }}>스샷 첨부</span>
        <span style={{ fontSize: 15, fontWeight: 700, padding: '4px 12px', borderRadius: 14, border: `1px solid ${C.line}`, background: '#fff', color: C.gray }}>핀 찍기</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea rows={tall ? 4 : 2} placeholder="형(으)로 기록 · 스샷 Ctrl+V 붙여넣기 가능. Enter 전송 · Shift+Enter 줄바꿈" style={{ flex: 1, resize: 'none', borderRadius: 8, border: `1px solid ${C.line}`, padding: '9px 11px', fontSize: 16, lineHeight: 1.5, fontFamily: FONT }} />
        <button style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: C.line, color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: FONT }}>기록</button>
      </div>
    </div>
  )
}
function SpecLine({ expanded }) {
  return (
    <section style={{ ...CARD, flex: 'none' }}>
      <div style={{ ...HEAD, display: 'flex', justifyContent: 'space-between' }}><span>기획 내용</span><span style={{ fontSize: 15, fontWeight: 700, color: C.gray }}>{expanded ? '접기' : '펼치기'}</span></div>
      <div style={{ maxHeight: expanded ? 'none' : 60, overflow: 'hidden', padding: '12px 18px' }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{cur.spec.map((s, i) => <li key={i} style={{ fontSize: 16, lineHeight: 1.55, color: C.ink2 }}>{s}</li>)}</ul>
      </div>
    </section>
  )
}

// ── 케이스들 (각각 전체 화면 높이 프레임) ──
const FRAME_H = 960   // 형 모니터 기준 리뷰 창 높이 근사

function Case0({ entries }) {
  return (
    <div style={{ height: FRAME_H, display: 'flex', flexDirection: 'column', background: C.bg }}>
      <header style={{ flex: 'none', background: '#fff', borderBottom: `1px solid ${C.line}`, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <DomainTabs /><TitleRow /><ScreenChips />
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 18, gap: 18 }}>
        <div style={{ width: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone w={360} h={720} /></div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SpecLine />
          <section style={{ ...CARD, flex: 1 }}><div style={HEAD}>기록 <span style={{ color: C.gray, fontWeight: 600 }}>형 · 대표님 · 카스</span></div><Thread entries={entries} /><Composer /></section>
        </div>
      </div>
    </div>
  )
}
/** 1: 폰 세로 꽉 + 우: 탭 2줄 → 기록 → 작성칸. 기획은 한 줄 접힘 */
function Case1({ entries }) {
  const h = FRAME_H - 36, w = Math.round(h * 0.462)
  return (
    <div style={{ height: FRAME_H, display: 'flex', background: C.bg, padding: 18, gap: 18 }}>
      <Phone w={w} h={h} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...CARD, flex: 'none', padding: '12px 16px', gap: 10 }}><DomainTabs small /><ScreenChips /><TitleRow /></div>
        <SpecLine />
        <section style={{ ...CARD, flex: 1 }}><div style={HEAD}>기록</div><Thread entries={entries} /><Composer /></section>
      </div>
    </div>
  )
}
/** 2: 폰 + 화면 목록 세로 열 + 기록 (3열) */
function Case2({ entries }) {
  const h = FRAME_H - 36, w = Math.round(h * 0.462)
  return (
    <div style={{ height: FRAME_H, display: 'flex', background: C.bg, padding: 18, gap: 18 }}>
      <Phone w={w} h={h} />
      <div style={{ ...CARD, width: 230, flex: 'none', padding: 12, gap: 8, overflowY: 'auto' }}>
        <select style={{ fontSize: 16, fontWeight: 800, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.line}`, fontFamily: FONT }}>{DOMAINS.map((d) => <option key={d.key}>{d.label}</option>)}</select>
        <ScreenChips vertical />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...CARD, flex: 'none', padding: '12px 16px' }}><TitleRow /></div>
        <section style={{ ...CARD, flex: 1 }}><div style={{ ...HEAD, display: 'flex', justifyContent: 'space-between' }}><span>기록</span><span style={{ fontSize: 15, fontWeight: 700, color: C.gray }}>기획 내용 보기</span></div><Thread entries={entries} /><Composer /></section>
      </div>
    </div>
  )
}
/** 3: 폰 폭 45% (크게) + 우: 드롭다운 두 개로 도메인·화면 고르고 게시판만 */
function Case3({ entries }) {
  const h = FRAME_H - 36, w = Math.round(h * 0.462)
  return (
    <div style={{ height: FRAME_H, display: 'flex', background: C.bg, padding: 18, gap: 18 }}>
      <div style={{ flex: 'none', width: '42%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone w={w} h={h} /></div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...CARD, flex: 'none', padding: '12px 16px', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <select style={{ fontSize: 16, fontWeight: 800, padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, fontFamily: FONT }}>{DOMAINS.map((d) => <option key={d.key}>{d.label}</option>)}</select>
          <select style={{ fontSize: 16, fontWeight: 700, padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.line}`, fontFamily: FONT, flex: 1 }}>{domain.screens.map((s) => <option key={s.id}>{s.no} {s.name}</option>)}</select>
          <span style={{ fontSize: 15, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', color: C.gray }}>기획</span>
          <span style={{ fontSize: 15, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.ink}`, background: C.ink, color: '#fff' }}>전체 테이블</span>
        </div>
        <section style={{ ...CARD, flex: 1 }}><div style={HEAD}>기록 <span style={{ color: C.gray, fontWeight: 600 }}>{cur.no} {cur.name}</span></div><Thread entries={entries} /><Composer tall /></section>
      </div>
    </div>
  )
}
/** 4: 폰 실기 1:1 (390×844, 스케일 없음) + 우 게시판. 헤더 얇게 한 줄 */
function Case4({ entries }) {
  return (
    <div style={{ height: FRAME_H, display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 'none', background: '#fff', borderBottom: `1px solid ${C.line}`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}><DomainTabs small /></div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 16, gap: 16 }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-start' }}><Phone w={390} h={844} scale1 /></div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...CARD, flex: 'none', padding: '10px 14px', gap: 8 }}><ScreenChips /><TitleRow /></div>
          <section style={{ ...CARD, flex: 1 }}><div style={HEAD}>기록</div><Thread entries={entries} /><Composer /></section>
        </div>
      </div>
    </div>
  )
}
/** 5: 폰 크게 + 우: 기록 열 / 작성·기획 열 (2열) */
function Case5({ entries }) {
  const h = FRAME_H - 36, w = Math.round(h * 0.462)
  return (
    <div style={{ height: FRAME_H, display: 'flex', background: C.bg, padding: 18, gap: 18 }}>
      <Phone w={w} h={h} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...CARD, flex: 'none', padding: '12px 16px', gap: 10 }}><DomainTabs small /><ScreenChips /></div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
          <section style={{ ...CARD, flex: 3 }}><div style={HEAD}>기록 <span style={{ color: C.gray, fontWeight: 600 }}>{cur.no} {cur.name}</span></div><Thread entries={entries} /></section>
          <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <section style={{ ...CARD, flex: 'none' }}><div style={HEAD}>새 기록</div><Composer tall /></section>
            <SpecLine expanded />
          </div>
        </div>
      </div>
    </div>
  )
}

const CASES = [
  ['0', '현재 — 좌 폰 360 / 우 기획+기록 세로', Case0],
  ['1', '폰 세로 꽉 / 우: 탭 2줄 → 기획 한 줄 → 기록 → 작성칸', Case1],
  ['2', '폰 세로 꽉 / 화면 목록 세로 열 / 기록 (3열)', Case2],
  ['3', '폰 크게 가운데 / 우: 드롭다운 두 개 + 게시판만', Case3],
  ['4', '폰 실기 1:1 (390×844, 확대 없음) / 우: 게시판', Case4],
  ['5', '폰 세로 꽉 / 우: 기록 열 + 작성·기획 열', Case5],
]

export default function ReviewLab() {
  const [entries, setEntries] = useState([])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    loginAsSeed(getSavedAcct()).catch(() => {}).finally(() => setReady(true))
    return subscribeThread((t) => setEntries((t?.[SCREEN_ID] || []).slice(-14)))
  }, [])
  if (!ready) return null
  return (
    <div style={{ fontFamily: FONT, color: C.ink, background: '#e9ecf1', padding: '24px 0 80px' }}>
      <div style={{ padding: '0 24px 16px', fontSize: 23, fontWeight: 800 }}>리뷰 페이지 재구축 시안 — 번호로 골라줘 (폰은 실제 앱 iframe, 기록은 실제 데이터)</div>
      {CASES.map(([n, label, Comp]) => (
        <div key={n} id={`case${n}`} style={{ marginBottom: 40 }}>
          <div style={{ padding: '0 24px 8px', fontSize: 19, fontWeight: 800 }}><span style={{ display: 'inline-block', minWidth: 30 }}>{n}</span> {label}</div>
          <div style={{ margin: '0 24px', border: '1px solid #cfd5dd', overflow: 'hidden', background: C.bg }}><Comp entries={entries} /></div>
        </div>
      ))}
    </div>
  )
}
