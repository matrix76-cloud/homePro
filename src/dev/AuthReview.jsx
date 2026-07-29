import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import html2canvas from 'html2canvas'
import { auth } from '../api/config'
import { DOMAINS } from './reviewData'
import { subscribeThread, postEntry, deleteEntry } from './reviewThreadService'
import { SEED_ACCOUNTS, loginAsSeed, logoutReview, ANON, getSavedAcct, saveAcct, ensureAdminSession } from './reviewAuth'
import QaBoard from './QaBoard'

// 개발 전용 리뷰 허브 (/review/:id · DEV 게이트) — homePro 전 도메인 통합. (seekone 리뷰 도구 이식)
// 좌=실제 화면(iframe) + 핀 찍기(화면공유로 지도까지 캡처) / 우상=기획 / 우하=기록 스레드(Firestore).
const ALL = DOMAINS.flatMap((d) => d.screens.map((s) => ({ ...s, domain: d.key })))

const CORAL = '#00C74E'
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
// 캔버스에 핀(라벨 말풍선 + 점)을 그림 — 캡처 이미지에 핀 번호가 박혀 겹침 혼란 해소
function drawPinOnCanvas(ctx, xPx, yPx, label) {
  ctx.font = "bold 13px 'Pretendard Variable', Pretendard, sans-serif"
  const padX = 9, bh = 24
  const tw = ctx.measureText(label).width
  const bw = tw + padX * 2
  const bx = xPx - bw / 2
  const by = yPx - bh - 9
  roundRect(ctx, bx, by, bw, bh, 7)
  ctx.fillStyle = CORAL; ctx.fill()
  ctx.beginPath()
  ctx.moveTo(xPx - 5, by + bh); ctx.lineTo(xPx + 5, by + bh); ctx.lineTo(xPx, by + bh + 7)
  ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.arc(xPx, yPx, 4, 0, Math.PI * 2)
  ctx.fillStyle = CORAL; ctx.fill()
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, xPx, by + bh / 2 + 0.5)
}
// 폴백: html2canvas (카카오맵 등 CORS 이미지는 빠질 수 있음 → 그럴 땐 화면공유가 필요)
async function captureViaHtml2canvas(iframeEl, pins) {
  const w = iframeEl.clientWidth, h = iframeEl.clientHeight
  let base = null
  try {
    const doc = iframeEl.contentDocument
    const win = iframeEl.contentWindow
    base = await html2canvas(doc.body, {
      useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false,
      width: w, height: h, windowWidth: w, windowHeight: h,
      x: (win && win.scrollX) || 0, y: (win && win.scrollY) || 0, scale: 1,
    })
  } catch { base = null }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)
  if (base) { try { ctx.drawImage(base, 0, 0, w, h) } catch { /* noop */ } }
  pins.forEach((p) => drawPinOnCanvas(ctx, (p.x / 100) * w, (p.y / 100) * h, p.label || ''))
  try { return canvas.toDataURL('image/jpeg', 0.82) } catch { return '' }
}

// 라우트 파라미터(:orderId 등)를 iframe 미리보기용 데모값으로 치환.
// path에 " · "로 여러 경로가 적혀 있으면 첫 경로만, 괄호 주석은 제거하고 사용.
const previewSrc = (path) => (path || '').split(' · ')[0].split(' (')[0].trim().replace(/:[A-Za-z]+/g, 'demo')

export default function AuthReview() {
  const { id } = useParams()
  const nav = useNavigate()
  const cur = ALL.find((r) => r.id === id) || ALL[0]
  const domain = DOMAINS.find((d) => d.key === cur.domain)
  const isPC = cur.domain === 'admin' || cur.domain === 'landing' // 관리자·PC랜딩=PC 풀와이드 → 넓은 프레임(스케일 축소)
  const isLanding = cur.domain === 'landing' // 랜딩=실제 데스크톱 뷰포트 통째 축소
  const isQa = cur.domain === 'qa' // 기능점검 결과표 — 미리보기·계정전환 없이 판정+스샷 보드만
  const [thread, setThread] = useState(null) // { id: [{by,at,text}] }
  const [draft, setDraft] = useState('')
  const [author, setAuthor] = useState('형') // 작성자: 형 | 카스
  const [attachImgs, setAttachImgs] = useState([]) // 첨부 스샷 dataURL[]
  const [pinMode, setPinMode] = useState(false) // 핀 찍기 모드
  const [draftPins, setDraftPins] = useState([]) // 작성 중 핀 [{x,y}]
  const [viewPins, setViewPins] = useState(null) // 기록 클릭 시 화면에 표시할 핀
  const [specExpanded, setSpecExpanded] = useState(false) // 기획 펼치기(기본 접힘=4줄)
  const [sending, setSending] = useState(false)
  const iframeRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [sharing, setSharing] = useState(false)
  const [busy, setBusy] = useState('')
  const capturedRef = useRef(false) // '핀 박아 캡처'로 이미 캡처했는지(등록 시 중복 캡처 방지)

  // iframe 데모 로그인 — 선택 계정(시드)으로 로그인해 로그인 필요 화면도 실제로 보이게
  const [acctUid, setAcctUid] = useState(getSavedAcct) // 선택한 데모 계정(또는 ANON)
  const [authUid, setAuthUid] = useState(null) // 실제 로그인된 uid
  const [authBusy, setAuthBusy] = useState(false)
  const [authErr, setAuthErr] = useState('')
  const [previewImg, setPreviewImg] = useState(null) // 이미지 원본 미리보기(라이트박스)

  // 라이트박스 ESC 닫기
  useEffect(() => {
    if (!previewImg) return
    const onKey = (e) => { if (e.key === 'Escape') setPreviewImg(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewImg])

  useEffect(() => subscribeThread((all) => setThread(all)), [])
  useEffect(() => { setDraftPins([]); setViewPins(null); setPinMode(false) }, [cur.id])
  // 준비사항은 읽어야 하는 체크리스트라 기본으로 펼쳐둔다 (화면 리뷰는 기존대로 접힘)
  useEffect(() => { setSpecExpanded(cur.domain === 'prep') }, [cur.domain, cur.id])
  // 관리자 화면 iframe이 열리도록 더미 admin 세션 보장(가드는 존재만 확인)
  useEffect(() => { ensureAdminSession() }, [])

  // 실제 로그인 상태 구독
  useEffect(() => onAuthStateChanged(auth, (u) => setAuthUid(u ? u.uid : null)), [])
  // 선택 계정 ↔ 로그인 상태 동기화 (ANON이면 로그아웃, 아니면 그 시드로 로그인)
  useEffect(() => {
    let cancel = false
    ;(async () => {
      setAuthErr('')
      if (acctUid === ANON) { if (authUid) { try { await logoutReview() } catch { /* noop */ } } return }
      if (authUid === acctUid) return
      setAuthBusy(true)
      try { await loginAsSeed(acctUid) } catch (e) { if (!cancel) setAuthErr(e?.message || '로그인 실패') }
      if (!cancel) setAuthBusy(false)
    })()
    return () => { cancel = true }
  }, [acctUid, authUid])
  const changeAcct = (uid) => { saveAcct(uid); setAcctUid(uid) }

  // ── 화면공유 (핀 박은 스샷 캡처용 — 카카오맵 등 지도까지 포함) ──
  const stopShare = useCallback(() => {
    const s = streamRef.current
    if (s) s.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setSharing(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])
  const startShare = useCallback(async () => {
    if (streamRef.current) return streamRef.current
    if (!navigator.mediaDevices?.getDisplayMedia) return null
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' })
      streamRef.current = stream
      setSharing(true)
      const v = videoRef.current
      if (v) { v.srcObject = stream; try { await v.play() } catch { /* noop */ } }
      const track = stream.getVideoTracks()[0]
      if (track) track.addEventListener('ended', stopShare)
      return stream
    } catch { return null }
  }, [stopShare])
  useEffect(() => () => stopShare(), [stopShare])

  // 핀이 가리킨 실제 요소 정보(개발자가 위치를 정확히 읽음)
  const describeTarget = (clientX, clientY) => {
    try {
      const el0 = iframeRef.current
      const doc = el0 && el0.contentDocument
      if (!doc) return null
      const r = el0.getBoundingClientRect()
      const el = doc.elementFromPoint(clientX - r.left, clientY - r.top)
      if (!el) return null
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
      return { tag: (el.tagName || '').toLowerCase(), text, label: el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || '' }
    } catch { return null }
  }
  // 화면공유 프레임에서 iframe 영역만 잘라 핀을 얹어 캡처(폴백 html2canvas)
  const captureFrame = async (pins) => {
    const iframeEl = iframeRef.current
    const v = videoRef.current
    if (!iframeEl) return ''
    if (v && v.videoWidth > 0 && streamRef.current) {
      await new Promise((r) => requestAnimationFrame(() => r()))
      const rect = iframeEl.getBoundingClientRect()
      const scaleX = v.videoWidth / window.innerWidth
      const scaleY = v.videoHeight / window.innerHeight
      const cw = Math.max(1, Math.round(rect.width))
      const ch = Math.max(1, Math.round(rect.height))
      const canvas = document.createElement('canvas')
      canvas.width = cw; canvas.height = ch
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch)
      try { ctx.drawImage(v, rect.left * scaleX, rect.top * scaleY, rect.width * scaleX, rect.height * scaleY, 0, 0, cw, ch) } catch { /* noop */ }
      pins.forEach((p) => drawPinOnCanvas(ctx, (p.x / 100) * cw, (p.y / 100) * ch, p.label || ''))
      try { return canvas.toDataURL('image/jpeg', 0.85) } catch { /* noop */ }
    }
    return captureViaHtml2canvas(iframeEl, pins)
  }
  // 핀 박아 캡처 → 첨부 이미지에 자동 추가 (draftPins는 위치 저장용으로 유지)
  const captureWithPins = async () => {
    if (!draftPins.length || busy) return
    if (!streamRef.current) { const s = await startShare(); if (!s) alert('화면공유를 허용하면 지도까지 캡처됩니다. 취소하면 html2canvas로 캡처(지도 배경은 빠질 수 있음).') }
    setBusy('캡처 중...')
    setPinMode(false)
    await new Promise((r) => setTimeout(r, 280))
    let dataUrl = ''
    try { dataUrl = await captureFrame(draftPins) } catch { /* noop */ }
    if (dataUrl) { setAttachImgs((p) => [...p, dataUrl]); capturedRef.current = true; setPreviewImg(dataUrl) } // 찍은 원본 즉시 미리보기
    setBusy('')
  }

  const entries = (thread && thread[cur.id]) || []

  // 미답변 수 — 형·대표님이 올린 질문/지시(root) 중 답글(replyTo)이 안 달린 것
  const unanswered = (sid) => {
    const items = (thread && thread[sid]) || []
    const answered = new Set(items.filter((x) => x.replyTo).map((x) => x.replyTo))
    return items.filter((x) => !x.replyTo && (x.by === '형' || x.by === '대표님') && !answered.has(x.pid)).length
  }
  const domainUnanswered = (d) => d.screens.reduce((n, s) => n + unanswered(s.id), 0)

  // 기록 남기기 → Firestore (실시간 반영, 배포 공유)
  const post = async () => {
    const text = draft.trim()
    if ((!text && !attachImgs.length && !draftPins.length) || sending) return
    setSending(true)
    try {
      let imgs = attachImgs
      // 핀을 찍었는데 아직 캡처 안 했으면 → 등록 시 자동으로 핀 박은 스샷 캡처해서 함께 저장
      if (draftPins.length > 0 && !capturedRef.current) {
        if (!streamRef.current) await startShare()
        setBusy('캡처 중...')
        await new Promise((r) => setTimeout(r, 300))
        let dataUrl = ''
        try { dataUrl = await captureFrame(draftPins) } catch { /* noop */ }
        if (dataUrl) imgs = [...attachImgs, dataUrl]
        setBusy('')
      }
      await postEntry({ screenId: cur.id, by: author, text, imgs, pins: draftPins })
      setDraft(''); setAttachImgs([]); setDraftPins([]); setPinMode(false); capturedRef.current = false
    } catch (e) {
      alert('저장 실패: ' + (e?.message || e))
    } finally {
      setSending(false); setBusy('')
    }
  }

  // 스샷 첨부 — 파일 선택 / 클립보드 붙여넣기(Ctrl+V) → dataURL 누적
  // 리사이즈+jpeg 압축 (Firestore 문서 1MB 제한 대비)
  const fileToDataUrl = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 1400
        let { width, height } = img
        if (width > max || height > max) { const s = Math.min(max / width, max / height); width = Math.round(width * s); height = Math.round(height * s) }
        const c = document.createElement('canvas'); c.width = width; c.height = height
        c.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(c.toDataURL('image/jpeg', 0.72))
      }
      img.onerror = () => resolve(reader.result)
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
  const addFiles = async (files) => {
    const arr = []
    for (const f of files) if (f && f.type.startsWith('image/')) arr.push(await fileToDataUrl(f))
    if (arr.length) setAttachImgs((p) => [...p, ...arr])
  }
  const onPasteImg = (e) => {
    const imgs = [...(e.clipboardData?.items || [])].filter((it) => it.type.startsWith('image/')).map((it) => it.getAsFile()).filter(Boolean)
    if (imgs.length) { e.preventDefault(); addFiles(imgs) }
  }
  // 화면 위 핀 찍기 (뷰포트 % 좌표 + 작성자+번호 라벨 + 가리킨 요소정보)
  const addPin = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = +(((e.clientX - r.left) / r.width) * 100).toFixed(1)
    const y = +(((e.clientY - r.top) / r.height) * 100).toFixed(1)
    const label = `${author}${draftPins.length + 1}` // 작성자+번호(예: 형1) — 캡처 이미지에 박혀 번호 겹침 혼란 없음
    const target = describeTarget(e.clientX, e.clientY)
    setDraftPins((p) => [...p, { x, y, label, target }])
  }

  // 기록 1건 삭제 (confirm 후) — Firestore docId(pid). 글 삭제 시 그 댓글도 함께.
  const del = async (pid) => {
    if (!pid || !window.confirm('이 기록을 삭제할까요? (달린 댓글도 함께 삭제)')) return
    try { await deleteEntry(pid) } catch (e) { alert('삭제 실패: ' + (e?.message || e)) }
  }

  // 기록 카드 (isReply=true면 형/카스 글 밑에 댓글처럼 들여쓰기)
  const renderCard = (e, isReply) => {
    const st = BY_STYLE[e.by] || BY_STYLE['형']
    return (
      <div key={e.pid || `${e.by}_${e.at}_${(e.text || '').slice(0, 8)}`} style={{ marginLeft: isReply ? 22 : 0, padding: '10px 13px', borderRadius: 10, border: `1px solid ${st.line}`, background: st.bg, boxShadow: '0 1px 2px rgba(20,30,45,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {isReply && <span style={{ color: C.gray2, fontSize: 16 }}>↳</span>}
          <b style={{ fontSize: 15, color: st.ink }}>{e.by}</b>
          <span style={{ fontSize: 14, color: C.gray2, fontVariantNumeric: 'tabular-nums' }}>{e.at}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => del(e.pid || entries.indexOf(e))} title="이 기록 삭제" style={{ flex: 'none', width: 20, height: 20, borderRadius: 5, border: 'none', background: 'transparent', color: C.gray2, cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        {e.text && <div style={{ fontSize: 16, lineHeight: 1.55, color: C.ink2, whiteSpace: 'pre-line' }}>{e.text}</div>}
        {e.imgs && e.imgs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: e.text ? 6 : 0 }}>
            {e.imgs.map((src, k) => (
              <img key={k} src={src} alt="첨부" onClick={() => setPreviewImg(src)} style={{ maxWidth: 200, maxHeight: 140, borderRadius: 6, border: `1px solid ${C.line}`, cursor: 'zoom-in', objectFit: 'cover' }} />
            ))}
          </div>
        )}
        {e.pins && e.pins.length > 0 && (
          <button onClick={() => { setViewPins(e.pins); setPinMode(false) }} style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: '#00C74E', background: '#fdf2ee', border: '1px solid #f5d3c6', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
            화면 핀 {e.pins.length}개 위치 보기
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, color: C.ink, fontFamily: FONT }}>
      {/* 화면공유 프레임 소스(숨김) — 핀 박은 스샷 캡처용 */}
      <video ref={videoRef} muted autoPlay playsInline style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -9999, top: -9999 }} />

      {/* 이미지 원본 미리보기 라이트박스 — 캡처 직후 + 첨부 클릭 공통 */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,20,30,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={previewImg} alt="원본 미리보기" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.45)', cursor: 'default' }} />
          <button onClick={() => setPreviewImg(null)} style={{ position: 'absolute', top: 18, right: 22, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.92)', color: '#2b3440', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>닫기 (ESC)</button>
        </div>
      )}
      <header style={{ flex: 'none', background: C.card, borderBottom: `1px solid ${C.line}`, padding: '12px 20px' }}>
        {/* 도메인 탭 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {DOMAINS.map((d) => {
            const on = d.key === cur.domain
            const nUn = domainUnanswered(d)
            return (
              <button
                key={d.key}
                onClick={() => nav(`/review/${d.screens[0].id}`)}
                style={{
                  fontSize: 16, fontWeight: 800, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${on ? C.ink : C.line}`, background: on ? C.ink : '#fff', color: on ? '#fff' : C.ink2,
                }}
              >
                {d.label} <span style={{ fontWeight: 600, opacity: 0.7 }}>{d.screens.length}</span>
                {nUn > 0 && <span style={NBADGE} title={`미답변 ${nUn}건`}>{nUn}</span>}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <button onClick={() => nav('/review-table')} style={{ fontSize: 15, fontWeight: 800, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${C.ink}`, background: C.ink, color: '#fff' }}>전체 테이블</button>
          <span style={{ fontSize: 15, color: C.gray, marginLeft: 6 }}>좌=화면 / 우상=기획 / 우하=기록</span>
        </div>

        {/* 현재 화면 정보 + iframe 데모 계정 셀렉터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.gray, fontVariantNumeric: 'tabular-nums' }}>{cur.no}</span>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.3px' }}>{cur.name}</h1>
          <span style={{ fontSize: 15, color: C.gray2, fontFamily: 'ui-monospace, monospace' }}>{cur.path || '— 화면 없음(정책)'}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 15, color: C.gray, fontWeight: 700 }}>iframe 계정</span>
          <select value={acctUid} onChange={(e) => changeAcct(e.target.value)} style={SEL}>
            <option value={ANON}>로그인 안 함 (인증화면)</option>
            <optgroup label="의뢰자">
              {SEED_ACCOUNTS.filter((a) => a.role === '의뢰자').map((a) => <option key={a.uid} value={a.uid}>{a.nickname} · {a.region}</option>)}
            </optgroup>
            <optgroup label="홈프로">
              {SEED_ACCOUNTS.filter((a) => a.role.startsWith('홈프로')).map((a) => <option key={a.uid} value={a.uid}>{a.nickname} · {a.role.replace('홈프로', '').replace(/[()]/g, '').trim() || '메인'} · {a.region}</option>)}
            </optgroup>
          </select>
          {authBusy && <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>로그인 중…</span>}
          {!authBusy && authErr && <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }} title={authErr}>로그인 실패</span>}
          {!authBusy && !authErr && acctUid !== ANON && authUid && <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>로그인됨</span>}
        </div>

        {/* 현재 도메인 화면 칩 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
          {domain.screens.map((r) => {
            const nUn = unanswered(r.id)
            return (
              <button
                key={r.id}
                onClick={() => nav(`/review/${r.id}`)}
                style={{
                  fontSize: 15, fontWeight: 700, padding: '4px 10px', borderRadius: 14, cursor: 'pointer',
                  border: `1px solid ${nUn > 0 ? '#00C74E' : r.id === cur.id ? C.ink : C.line}`,
                  background: r.id === cur.id ? C.ink : '#fff', color: r.id === cur.id ? '#fff' : C.gray,
                }}
              >
                {r.no} {r.name}
                {nUn > 0 && <span style={NBADGE} title={`미답변 ${nUn}건`}>{nUn}</span>}
              </button>
            )
          })}
        </div>
      </header>

      {/* 기능점검 결과 — 미리보기·계정전환 없이 판정+스샷 보드만 (seekone 방식 이식 7/29) */}
      {isQa ? (
        <QaBoard />
      ) : (
      <>
      {/* 본문: 좌 화면 / 우 (기획 + 노트) */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 18, gap: 18 }}>
        <div style={{ flex: 'none', width: isLanding ? 1000 : isPC ? 780 : 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {cur.path && !isPC && (
            <div style={{ width: 360, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => { setPinMode((v) => !v); setViewPins(null) }} style={{ fontSize: 15, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${pinMode ? '#00C74E' : C.line}`, background: pinMode ? '#00C74E' : '#fff', color: pinMode ? '#fff' : C.gray }}>
                {pinMode ? '핀 찍는 중 · 화면 클릭' : '핀 찍기'}
              </button>
              {draftPins.length > 0 && (
                <>
                  <span style={{ fontSize: 15, color: C.gray, fontWeight: 600 }}>핀 {draftPins.length}
                    <button onClick={() => setDraftPins([])} style={{ marginLeft: 5, color: '#00C74E', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}>지우기</button>
                  </span>
                  <button onClick={captureWithPins} disabled={!!busy} title="화면공유로 지도까지 캡처 + 핀 박아 첨부" style={{ fontSize: 15, fontWeight: 800, padding: '5px 12px', borderRadius: 8, cursor: busy ? 'default' : 'pointer', border: 'none', background: '#2b3440', color: '#fff' }}>
                    {busy || '핀 박아 캡처'}
                  </button>
                </>
              )}
              {sharing && (
                <span style={{ fontSize: 14, color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />공유중
                  <button onClick={stopShare} style={{ marginLeft: 2, background: 'none', border: 'none', color: C.gray2, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>중지</button>
                </span>
              )}
              {viewPins && (
                <button onClick={() => setViewPins(null)} style={{ fontSize: 15, color: C.gray, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}>핀 숨기기</button>
              )}
            </div>
          )}
          {cur.path && isLanding ? (
            // PC 랜딩: 실제 데스크톱 뷰포트(1512×900)를 통째로 0.648 스케일 축소
            <div style={{ width: 980, height: 583, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', background: '#fff' }}>
              <div style={{ width: 1512, height: 900, transform: 'scale(0.648)', transformOrigin: 'top left' }}>
                <iframe key={`${cur.id}_${authUid || 'anon'}`} title={cur.name} src={previewSrc(cur.path)} style={{ width: 1512, height: 900, border: 'none' }} />
              </div>
            </div>
          ) : cur.path && isPC ? (
            // 관리자 PC 화면: 1266px 논리폭을 0.6 스케일로 축소해 전체 레이아웃 프리뷰
            <div style={{ width: 760, height: '100%', maxHeight: 822, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', background: '#fff' }}>
              <div style={{ width: 1266, height: 1370, transform: 'scale(0.6)', transformOrigin: 'top left' }}>
                <iframe key={`${cur.id}_${authUid || 'anon'}`} title={cur.name} src={previewSrc(cur.path)} style={{ width: 1266, height: 1370, border: 'none' }} />
              </div>
            </div>
          ) : cur.path ? (
            <div style={{ position: 'relative', width: 360, height: '100%', maxHeight: 720, borderRadius: 20, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', background: '#fff' }}>
              <iframe ref={iframeRef} key={`${cur.id}_${authUid || 'anon'}`} title={cur.name} src={previewSrc(cur.path)} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: pinMode ? 'none' : 'auto' }} />
              {(pinMode || viewPins) && (
                <div onClick={pinMode ? addPin : undefined} style={{ position: 'absolute', inset: 0, cursor: pinMode ? 'crosshair' : 'default', background: pinMode ? 'rgba(37,113,227,0.05)' : 'transparent' }}>
                  {(pinMode ? draftPins : viewPins || []).map((p, i) => (
                    <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -100%)', pointerEvents: 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: '#00C74E', color: '#fff', fontSize: 14, fontWeight: 800, padding: '2px 7px', borderRadius: 7, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }}>{p.label || i + 1}</div>
                        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #00C74E' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: 360, height: 460, borderRadius: 20, border: `1px dashed ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gray2, fontSize: 16, textAlign: 'center', padding: 24 }}>
              화면 없음 — 정책/로직 항목입니다.<br />오른쪽 기획 내용을 참고하세요.
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section style={{ ...CARD, flex: specExpanded ? '1 1 50%' : 'none', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...CARD_HEAD, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>기획 내용</span>
              <button onClick={() => setSpecExpanded((v) => !v)} style={{ fontSize: 15, fontWeight: 700, color: C.gray, background: 'none', border: 'none', cursor: 'pointer' }}>{specExpanded ? '접기' : '펼치기'}</button>
            </div>
            <div className="no-scrollbar" style={{ flex: specExpanded ? 1 : 'none', maxHeight: specExpanded ? 'none' : 100, overflowY: 'auto', padding: '14px 18px' }}>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cur.spec.map((s, i) => {
                  const star = s.startsWith('★')
                  return <li key={i} style={{ fontSize: 16, lineHeight: 1.55, color: star ? C.ink : C.ink2, fontWeight: star ? 700 : 400 }}>{s}</li>
                })}
              </ul>
            </div>
          </section>

          {/* 기록 스레드 — 형·카스 시간순, Firestore(reviewThreads) 실시간 저장 */}
          <section style={{ ...CARD, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...CARD_HEAD, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>기록 <span style={{ color: C.gray, fontWeight: 600 }}>형 · 대표님 · 카스 (시간순)</span></span>
              <span style={{ fontSize: 14, color: C.gray2, fontWeight: 600 }}>Firestore · reviewThreads</span>
            </div>

            {/* 스레드 목록 */}
            <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entries.length === 0 ? (
                <div style={{ color: C.gray2, fontSize: 16, textAlign: 'center', padding: '20px 0' }}>아직 기록이 없습니다. 아래에 남겨보세요.</div>
              ) : (
                // 형 글(root) + 그 밑에 카스 답글(replyTo=root.pid) 들여쓰기
                entries.filter((e) => !e.replyTo).flatMap((root) => [
                  renderCard(root, false),
                  ...entries.filter((c) => c.replyTo && c.replyTo === root.pid).map((c) => renderCard(c, true)),
                ])
              )}
            </div>

            {/* 입력 — 작성자(형/카스) 선택 후 기록 (Enter=전송 / Shift+Enter=줄바꿈) */}
            <div style={{ flex: 'none', borderTop: `1px solid ${C.line}`, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 15, color: C.gray, fontWeight: 700 }}>작성자</span>
                {['형', '대표님'].map((a) => {
                  const on = author === a
                  const st = BY_STYLE[a]
                  return (
                    <button key={a} onClick={() => setAuthor(a)} style={{ fontSize: 15, fontWeight: 700, padding: '4px 12px', borderRadius: 14, cursor: 'pointer', border: `1px solid ${on ? st.ink : C.line}`, background: on ? st.ink : '#fff', color: on ? '#fff' : C.gray }}>
                      {a}
                    </button>
                  )
                })}
                <div style={{ flex: 1 }} />
                <label style={{ fontSize: 15, fontWeight: 700, padding: '4px 12px', borderRadius: 14, cursor: 'pointer', border: `1px solid ${C.line}`, background: '#fff', color: C.gray }}>
                  스샷 첨부
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = '' }} />
                </label>
              </div>
              {attachImgs.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {attachImgs.map((src, k) => (
                    <div key={k} style={{ position: 'relative' }}>
                      <img src={src} alt="첨부" onClick={() => setPreviewImg(src)} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.line}`, cursor: 'zoom-in' }} />
                      <button onClick={() => setAttachImgs((p) => p.filter((_, j) => j !== k))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', border: 'none', background: C.ink, color: '#fff', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post() } }}
                  onPaste={onPasteImg}
                  placeholder={`${author}(으)로 기록 · 스샷 Ctrl+V 붙여넣기 가능. Enter 전송 · Shift+Enter 줄바꿈`}
                  rows={2}
                  style={{ flex: 1, resize: 'none', borderRadius: 8, border: `1px solid ${C.line}`, outline: 'none', padding: '9px 11px', fontSize: 16, lineHeight: 1.5, fontFamily: FONT, color: C.ink }}
                />
                <button onClick={post} disabled={sending || (!draft.trim() && !attachImgs.length)} style={{ flex: 'none', alignSelf: 'stretch', padding: '0 16px', borderRadius: 8, border: 'none', background: (draft.trim() || attachImgs.length) ? C.ink : C.line, color: '#fff', fontSize: 16, fontWeight: 800, cursor: (draft.trim() || attachImgs.length) ? 'pointer' : 'default' }}>
                  기록
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      </>
      )}
    </div>
  )
}

// 도우미(DouME) 톤 — 슬레이트 그레이(#3a4351 계열) 무채색 팔레트
const C = { ink: '#2b3440', ink2: '#3a4351', gray: '#566070', gray2: '#98a2b0', line: '#e6e9ee', line2: '#d6dbe2', bg: '#f7f8fa', card: '#ffffff' }
// 미답변 N 뱃지 — 형 질문에 답글 안 달린 화면/도메인 표시(포인트 원 + 흰 숫자)
const NBADGE = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, marginLeft: 5, padding: '0 4px', borderRadius: 8, background: CORAL, color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1, verticalAlign: 'middle' }
// 작성자별 카드 색 — 형/대표님=지시(선택) · 카스=답변(표시용)
const BY_STYLE = {
  형: { ink: '#2b3440', line: '#e6e9ee', bg: '#f7f9fb' },
  대표님: { ink: '#c05621', line: '#f3d8c4', bg: '#fdf6f0' },
  카스: { ink: '#3b6ea5', line: '#d3e0ec', bg: '#f3f7fb' },
}
const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif"
// iframe 데모 계정 셀렉터
const SEL = { fontSize: 15, padding: '5px 9px', borderRadius: 8, border: '1px solid #e6e9ee', background: '#fff', color: '#2b3440', fontFamily: FONT, outline: 'none', maxWidth: 240 }
// 카드 — 숨고 톤: 큰 라운드 + 테두리 유지 + 미세 다층 그림자. 좌측 컬러바 없음.
const CARD = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: '0 1px 2px rgba(20,30,45,0.05), 0 6px 18px rgba(20,30,45,0.04)' }
// 카드 상단 헤더 존 — 옅은 무채색 배경으로 제목/본문 명도 구분
const CARD_HEAD = { flex: 'none', padding: '14px 18px', background: '#f8fafb', borderBottom: `1px solid ${C.line}`, borderTopLeftRadius: 16, borderTopRightRadius: 16, fontSize: 17, fontWeight: 800 }
