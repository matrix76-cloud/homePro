import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DOMAINS } from './reviewData'
import { subscribeThread } from './reviewThreadService'

// 리뷰 테이블 뷰 (/review-table) — 화면별 스레드(/review)는 그대로, 전체를 표로 한눈에.
// 모든 화면의 root 글(형 지시)을 표로: 화면·작성자·내용·답변여부·시간.
const ALL = DOMAINS.flatMap((d) => d.screens.map((s) => ({ ...s, domain: d.key, domainLabel: d.label })))
const META = Object.fromEntries(ALL.map((s) => [s.id, s]))

const C = { ink: '#2b3440', ink2: '#3a4351', gray: '#566070', gray2: '#98a2b0', line: '#e6e9ee', bg: '#f7f8fa', card: '#fff' }
const BY_COLOR = { 형: '#2b3440', 대표님: '#c05621', 카스: '#3b6ea5' }
const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif"
const CORAL = '#2571e3'

export default function ReviewTable() {
  const nav = useNavigate()
  const [thread, setThread] = useState(null)
  const [onlyUnanswered, setOnlyUnanswered] = useState(false)
  const [domainF, setDomainF] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => subscribeThread(setThread), [])

  // 전체 root 글 + 답변정보 flat
  const rows = useMemo(() => {
    if (!thread) return []
    const list = []
    for (const [sid, items] of Object.entries(thread)) {
      const replied = new Set(items.filter((x) => x.replyTo).map((x) => x.replyTo))
      for (const r of items.filter((x) => !x.replyTo)) {
        const replies = items.filter((c) => c.replyTo === r.pid)
        list.push({
          sid, ...r, meta: META[sid],
          answered: replied.has(r.pid),
          replyCount: replies.length,
          isAsk: r.by === '형' || r.by === '대표님',
        })
      }
    }
    return list.sort((a, b) => (b.ts?.toMillis?.() || 0) - (a.ts?.toMillis?.() || 0))
  }, [thread])

  const filtered = rows.filter((r) => {
    if (!r.isAsk) return false // 카스 선글(알림/답변) 제외 — 형·대표님 지시만 표시
    if (onlyUnanswered && r.answered) return false
    if (domainF !== 'all' && r.meta?.domain !== domainF) return false
    if (q && !(`${r.text || ''} ${r.meta?.name || ''} ${r.sid}`.toLowerCase().includes(q.toLowerCase()))) return false
    return true
  })

  const unansweredCount = rows.filter((r) => r.isAsk && !r.answered).length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: FONT, padding: '18px 22px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>리뷰 테이블</h1>
        <span style={{ fontSize: 14, color: C.gray }}>전체 {rows.length}건 · <b style={{ color: CORAL }}>미답변 {unansweredCount}</b></span>
        <div style={{ flex: 1 }} />
        <button onClick={() => nav('/review')} style={btn(false)}>← 화면별 리뷰로</button>
      </div>

      {/* 필터 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap', background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10 }}>
        <button onClick={() => setOnlyUnanswered((v) => !v)} style={btn(onlyUnanswered)}>미답변만</button>
        <select value={domainF} onChange={(e) => setDomainF(e.target.value)} style={sel}>
          <option value="all">전체 도메인</option>
          {DOMAINS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="내용·화면 검색" style={{ ...sel, width: 200 }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: C.gray2 }}>{filtered.length}건 표시</span>
      </div>

      {/* 테이블 */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: `1px solid ${C.line}` }}>
                {['상태', '화면', '작성자', '내용', '첨부', '답글', '시간', ''].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 13, fontWeight: 700, color: C.gray, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '30px 0', textAlign: 'center', color: C.gray2 }}>표시할 글이 없습니다.</td></tr>
              ) : filtered.map((r) => {
                const need = r.isAsk && !r.answered
                return (
                  <tr key={r.pid} onClick={() => nav(`/review/${r.sid}`)} style={{ borderBottom: `1px solid ${C.line}`, cursor: 'pointer', background: need ? '#eef4ff' : '#fff' }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: need ? CORAL : C.gray2 }}>{need ? '· 미답변' : '완료'}</span>
                    </td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <b style={{ fontSize: 13, color: C.gray, fontVariantNumeric: 'tabular-nums' }}>{r.meta?.no || '-'}</b> {r.meta?.name || r.sid}
                      <div style={{ fontSize: 12, color: C.gray2 }}>{r.meta?.domainLabel || ''}</div>
                    </td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <b style={{ color: BY_COLOR[r.by] || C.ink }}>{r.by}</b>
                    </td>
                    <td style={{ padding: '9px 12px', maxWidth: 420 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, color: C.ink2 }}>{r.text || '(내용 없음)'}</div>
                    </td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: C.gray }}>
                      {r.imgs?.length ? `사진 ${r.imgs.length}` : ''} {r.pins?.length ? `핀 ${r.pins.length}` : ''}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: r.replyCount ? C.ink : C.gray2 }}>{r.replyCount}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: C.gray2, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{r.at || '-'}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, color: CORAL, fontWeight: 700 }}>열기 →</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const btn = (on) => ({ fontSize: 14, fontWeight: 700, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${on ? CORAL : C.line}`, background: on ? CORAL : '#fff', color: on ? '#fff' : C.ink2 })
const sel = { fontSize: 14, padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', color: C.ink, fontFamily: FONT, outline: 'none' }
