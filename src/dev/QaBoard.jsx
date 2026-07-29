import { useState, useEffect } from 'react'

// 기능점검 결과 보드 — 리뷰 페이지 '기능점검 결과' 탭.
// 심화점검 카테고리를 버튼으로 나열(형 지시 2026-07-29) — 완료된 카테고리는 결과표+스샷,
// 대기 카테고리는 점검 계획을 보여준다. 카스가 한 카테고리씩 점검을 돌려 채워 나간다.
// 데이터 = public/qa/manifest.json { categories: [{key,no,title,status,desc,dir?,sections?,bugs?}] }
//   status: done(결과 있음) | pending(점검 대기) | manual(실기기 — 자동화 제외)

const C = { line: '#e2e2e6', gray: '#666', weak: '#999', bad: '#d43a2f', soft: '#f4f4f6', ok: '#1c7d43' }

export default function QaBoard() {
  const [cats, setCats] = useState(null)
  const [sel, setSel] = useState(null)          // 선택 카테고리 key
  const [sections, setSections] = useState(null) // done 카테고리의 결과 [{label, sub, rows}]
  const [zoom, setZoom] = useState(null)

  useEffect(() => {
    fetch('/qa/manifest.json').then((r) => r.json()).then((m) => {
      const list = m.categories || []
      setCats(list)
      setSel(list.find((c) => c.status === 'done')?.key || list[0]?.key || null)
    }).catch(() => setCats([]))
  }, [])

  const cur = cats?.find((c) => c.key === sel)
  useEffect(() => {
    if (!cur || cur.status !== 'done') { setSections(null); return }
    let alive = true
    setSections(null)
    Promise.all((cur.sections || []).map((s) =>
      fetch(`/qa/${cur.dir}/${s.file}`).then((r) => r.json()).then((rows) => ({ ...s, rows })).catch(() => ({ ...s, rows: [] })),
    )).then((all) => { if (alive) setSections(all) })
    return () => { alive = false }
  }, [cur])

  if (cats === null) return <div style={emptyBox}>점검 카테고리를 불러오는 중…</div>
  if (!cats.length) return <div style={emptyBox}>등록된 점검 카테고리가 없습니다.</div>

  const doneN = cats.filter((c) => c.status === 'done').length
  const total = (sections || []).flatMap((s) => s.rows)
  const fails = total.filter((r) => !r.ok)

  return (
    <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 60px' }}>
      {/* 카테고리 버튼 그리드 */}
      <div style={{ fontSize: 13, color: C.gray, marginBottom: 8 }}>
        심화점검 카테고리 {cats.length}개 · 완료 {doneN} — 버튼을 누르면 결과(완료) 또는 점검 계획(대기)이 보입니다.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {cats.map((c) => {
          const on = c.key === sel
          const done = c.status === 'done'
          const manual = c.status === 'manual'
          return (
            <button key={c.key} onClick={() => setSel(c.key)}
              style={{
                padding: '9px 15px', borderRadius: 9, fontSize: 14, cursor: 'pointer', textAlign: 'left',
                fontWeight: on ? 700 : 600, lineHeight: 1.35,
                border: `1px solid ${on ? '#1c1c1e' : C.line}`,
                background: on ? '#1c1c1e' : '#fff',
                color: on ? '#fff' : done ? '#1c1c1e' : C.gray,
              }}>
              {c.title}
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginTop: 2, color: on ? '#bbb' : done ? C.ok : manual ? C.weak : C.weak }}>
                {done ? `완료 · ${c.date}` : manual ? '실기기(수동)' : '점검 대기'}
              </span>
            </button>
          )
        })}
      </div>

      {cur && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <b style={{ fontSize: 19 }}>{cur.title}</b>
            <span style={{ fontSize: 13, fontWeight: 700, color: cur.status === 'done' ? C.ok : C.weak }}>
              {cur.status === 'done' ? `점검 완료 (${cur.date})` : cur.status === 'manual' ? '실기기 수동 점검 — [실기기 테스트] 탭에서 진행' : '점검 대기 — 카스가 순차 진행'}
            </span>
          </div>
          <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.7, marginBottom: 14, maxWidth: 880 }}>{cur.desc}</p>
        </>
      )}

      {/* 완료 카테고리 — 총평 + 결과표 */}
      {cur?.status === 'done' && sections && (
        <div style={{ padding: '13px 16px', border: `1px solid ${C.line}`, borderRadius: 10, background: '#fff', marginBottom: 22, fontSize: 15, lineHeight: 1.8, maxWidth: 880 }}>
          전체 <b>{total.length}</b>개 항목 — 정상 <b>{total.length - fails.length}</b> · 문제 <b style={{ color: fails.length ? C.bad : undefined }}>{fails.length}</b>
          {cur.bugs?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 14, color: '#444' }}>
              {cur.bugs.map((b, i) => (
                <div key={i}>
                  {'①②③④⑤'[i] || `${i + 1}.`} {b.text} — <b style={{ color: b.status.includes('완료') ? C.gray : C.bad }}>{b.status}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {cur?.status === 'done' && sections === null && <div style={emptyBox}>점검 결과를 불러오는 중…</div>}

      {(sections || []).map((sec) => (
        <div key={sec.label} style={{ marginBottom: 34 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <b style={{ fontSize: 17 }}>{sec.label}</b>
            <span style={{ fontSize: 13, color: C.weak }}>{sec.sub}</span>
          </div>
          <div style={{ fontSize: 13, color: C.gray, marginBottom: 10 }}>
            {sec.rows.length}개 항목 중 정상 {sec.rows.filter((r) => r.ok).length} · 문제 {sec.rows.filter((r) => !r.ok).length}
          </div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', padding: '9px 14px', background: C.soft, borderBottom: `1px solid ${C.line}`, fontSize: 13, fontWeight: 700, color: C.gray }}>
              <span style={{ width: 40 }}>번호</span>
              <span style={{ width: 170 }}>기능</span>
              <span style={{ flex: 1.2 }}>수행 내용</span>
              <span style={{ width: 52 }}>판정</span>
              <span style={{ flex: 1.8 }}>확인 결과</span>
              <span style={{ width: 108 }}>스크린샷</span>
            </div>
            {sec.rows.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '11px 14px', borderBottom: i < sec.rows.length - 1 ? '1px solid #eee' : 'none', background: r.ok ? '#fff' : '#fdf6f5', fontSize: 14, lineHeight: 1.6 }}>
                <span style={{ width: 40, color: C.weak, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <span style={{ width: 170, fontWeight: 700, paddingRight: 8 }}>{r.name}</span>
                <span style={{ flex: 1.2, color: '#555', paddingRight: 10 }}>{r.action}</span>
                <span style={{ width: 52, fontWeight: 800, color: r.ok ? C.gray : C.bad }}>{r.ok ? '정상' : '문제'}</span>
                <span style={{ flex: 1.8, color: '#444', paddingRight: 10 }}>{r.note}</span>
                <span style={{ width: 108 }}>
                  {r.shot ? (
                    <img
                      src={`/qa/${cur.dir}/${r.shot}`} alt={`${r.name} 스크린샷`} loading="lazy"
                      onClick={() => setZoom(`/qa/${cur.dir}/${r.shot}`)}
                      style={{ width: 96, border: '1px solid #ddd', borderRadius: 6, display: 'block', cursor: 'zoom-in' }}
                    />
                  ) : <span style={{ fontSize: 12, color: C.weak }}>-</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 대기/수동 카테고리 안내 */}
      {cur && cur.status !== 'done' && (
        <div style={{ padding: '26px 20px', border: `1px dashed ${C.line}`, borderRadius: 10, background: '#fff', maxWidth: 880, fontSize: 14, color: C.gray, lineHeight: 1.8 }}>
          {cur.status === 'manual'
            ? '이 카테고리는 실기기에서만 확인할 수 있어 자동 점검에서 제외됩니다. 상단 [실기기 테스트] 탭의 체크리스트로 진행해 주세요.'
            : '아직 점검 전입니다. 점검이 완료되면 이 자리에 항목별 판정 + 스크린샷 결과표가 채워집니다.'}
        </div>
      )}

      {/* 스샷 확대 오버레이 */}
      {zoom && (
        <div onClick={() => setZoom(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 24 }}>
          <img src={zoom} alt="스크린샷 확대" style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  )
}

const emptyBox = { padding: '60px 0', textAlign: 'center', color: '#999', fontSize: 14 }
