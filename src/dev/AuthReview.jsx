import { useState, useEffect, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { DOMAINS } from './reviewData'
import { subscribeScreen, postEntry, deleteEntry } from './reviewThreadService'
import { SEED_ACCOUNTS, ensureAdminSession } from './reviewAuth'

// 리뷰 페이지 (/review) — 2026-09-12 재구축 (형 지시)
//   · 폰 4개를 나란히 띄운다. 칸마다 역할·아이디·비번을 위에 적어 두고, 각 폰은 로그인 화면부터 시작한다.
//     (비교선정 = 접수자 1 + 지원 홈프로 3 이 최대 시나리오라 4칸)
//   · 각 폰은 iframe name 이 'rvphone{n}' — src/api/config.js 가 이 이름을 보고 로그인을 메모리에만 두어 폰마다 다른 계정이 된다.
//   · 기록판(스레드·작성칸)은 세금 앱(SpeedVat) 리뷰처럼 떠 있는 창. 끌어서 옮길 수 있고 접으면 화면을 다 쓴다.
//   · 핀 찍기 → 폰 클릭 → 기록 등록 시 그 폰을 자동 캡처(핀 박아서). 스샷 첨부·붙여넣기도 그대로.
//   · 기록판은 게시판 하나(screenId='board') — 화면별로 나누지 않는다(형 지시 9/13 "콤보 다 없애도 돼"). 어느 화면인지는 스샷이 말해 준다.
//   · 폰 위 계정 콤보도 없앰 — 칸마다 권장 계정(접수자 a1 / 홈프로 b1·b2·b3)만 글씨로 적어 두고, 로그인 화면에 직접 친다.
const ALL = DOMAINS.flatMap((d) => d.screens.map((s) => ({ ...s, domain: d.key })))
const CORAL = '#00963F'
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

// 폰 기준 크기(앱은 390 폭으로 그려진다)
const PHONE_W = 390, PHONE_H = 844
const SLOTS = 4
const PAD = 14, GAP = 14
const LOGIN_PATH = '/MobileLogin'
const PASSWORD = 'test1234'   // 시드 계정 공통 비번 (2026-09-12 Identity Toolkit 으로 설정)
const PANEL_KEY = 'review.panel.v2'

// 시드 계정 → 로그인 아이디 (seed_A1 → a1). 비번은 전부 test1234.
const loginIdOf = (uid) => (uid || '').replace(/^seed_/, '').toLowerCase()
const roleOf = (a) => (a.role === '의뢰자' ? '접수자' : a.role.includes('지원자풀') ? '홈프로 (지원자풀)' : a.role.includes('지정') ? '홈프로 (지정배정용)' : '홈프로')
const DEFAULT_SLOTS = ['seed_A1', 'seed_B1', 'seed_B2', 'seed_B3']
const BOARD_ID = 'board'   // 게시판 하나 — 옛 화면별 기록은 /review-table 에서 본다

// 답글 머리의 상태 표기 "[처리완료] ..." → 상태와 본문으로 분리 (뱃지 없이 색 글씨로만)
const splitStatus = (text) => {
  const m = /^\[([^\]]{1,12})\]\s*/.exec(text || '')
  if (!m) return { status: '', body: text || '' }
  return { status: m[1], body: (text || '').slice(m[0].length) }
}
const statusColor = (s) => (s === '처리완료' || s === '완료' ? '#15803d' : s === '미완료' ? '#dc2626' : '#2b3440')

// 폰의 현재 주소 → reviewData 화면. 정확히 같은 경로 우선, 없으면 :param 을 포함한 패턴 매칭, 그래도 없으면 가장 긴 접두 일치.
const routeToScreen = (pathname) => {
  if (!pathname) return null
  const p = pathname.replace(/\/+$/, '') || '/'
  let best = null, bestLen = -1
  for (const s of ALL) {
    const paths = (s.path || '').split(' · ').map((x) => x.split(' (')[0].trim()).filter(Boolean)
    for (const raw of paths) {
      if (raw === p) return s
      const re = new RegExp('^' + raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]+/g, '[^/]+') + '$')
      if (re.test(p) && raw.length > bestLen) { best = s; bestLen = raw.length }
      if (!best && p.startsWith(raw + '/') && raw.length > bestLen) { best = s; bestLen = raw.length }
    }
  }
  return best
}

const loadJson = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fb } catch { return fb } }
const saveJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ } }

export default function AuthReview() {
  const [screenEntries, setScreenEntries] = useState(null) // 게시판 스레드
  const slots = DEFAULT_SLOTS
  const [paths, setPaths] = useState(['', '', '', ''])     // 각 폰의 현재 주소(칸 헤더에 화면 이름 표시용)
  const [focus, setFocus] = useState(0)                    // 마지막으로 만진 폰
  const screenId = BOARD_ID
  const [panelOpen, setPanelOpen] = useState(false)          // 기록판은 팝업으로만 — 열 때만 뜬다(형 지시 9/13)
  const [guideOpen, setGuideOpen] = useState(false)          // 안내(오늘 볼 것·계정·흐름) — 형 지시 9/14
  const [panelPos, setPanelPos] = useState(() => loadJson(PANEL_KEY, {}).pos || null)
  const [draft, setDraft] = useState('')
  const [author, setAuthor] = useState('형')
  const [attachImgs, setAttachImgs] = useState([])
  const [pinMode, setPinMode] = useState(false)
  const [draftPins, setDraftPins] = useState([])           // [{slot,x,y,label,target}]
  const [viewPins, setViewPins] = useState(null)           // 기록 클릭 시 보여줄 핀
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState('')
  const [sharing, setSharing] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [vw, setVw] = useState(() => window.innerWidth)
  const [vh, setVh] = useState(() => window.innerHeight)
  const iframeRefs = useRef([])
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const listRef = useRef(null)
  const panelRef = useRef(null)
  const dragRef = useRef(null)
  const capturedRef = useRef(false)

  useEffect(() => { ensureAdminSession() }, [])
  useEffect(() => subscribeScreen(screenId, (rows) => setScreenEntries(rows)), [screenId])
  useEffect(() => { saveJson(PANEL_KEY, { pos: panelPos }) }, [panelPos])
  useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  useEffect(() => {
    if (!previewImg) return
    const onKey = (e) => { if (e.key === 'Escape') setPreviewImg(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewImg])

  // 각 폰의 현재 주소를 1초마다 읽는다 (SPA 이동은 load 이벤트가 없다). 같은 주소라 읽을 수 있다.
  useEffect(() => {
    const t = setInterval(() => {
      setPaths((prev) => {
        const next = prev.slice()
        let changed = false
        for (let i = 0; i < SLOTS; i++) {
          let p = ''
          try { p = iframeRefs.current[i]?.contentWindow?.location?.pathname || '' } catch { p = '' }
          if (p !== prev[i]) { next[i] = p; changed = true }
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // ── 화면공유 (핀 박은 스샷 캡처용 — 지도까지 그대로) ──
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
      // 허용창을 방치하면 영영 안 돌아온다 → 12초 뒤 html2canvas 로
      const stream = await Promise.race([
        navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
      ])
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

  // ── 폰 크기: 4개가 가로로 들어가게. 1920 이면 실기 크기(1.0), 좁으면 축소 ──
  const PANEL_W = 520
  const availW = vw - PAD * 2 - GAP * (SLOTS - 1)
  const availH = vh - 52 - PAD * 2 - 74   // 상단바 52 + 칸 헤더 74
  const scale = Math.max(0.5, Math.min(1, availW / SLOTS / PHONE_W, availH / PHONE_H))
  const phoneW = Math.round(PHONE_W * scale), phoneH = Math.round(PHONE_H * scale)

  const describeTarget = (slot, clientX, clientY) => {
    try {
      const el0 = iframeRefs.current[slot]
      const doc = el0 && el0.contentDocument
      if (!doc) return null
      const r = el0.getBoundingClientRect()
      const el = doc.elementFromPoint((clientX - r.left) / scale, (clientY - r.top) / scale)
      if (!el) return null
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
      return { tag: (el.tagName || '').toLowerCase(), text, label: el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || '' }
    } catch { return null }
  }
  // 폰 하나를 찍는다 (화면공유 프레임에서 그 폰 영역만 오려서, 없으면 html2canvas). 핀은 그 폰 것만 얹는다.
  const captureSlot = async (slot, pins) => {
    const iframeEl = iframeRefs.current[slot]
    const v = videoRef.current
    if (!iframeEl) return ''
    const mine = pins.filter((p) => p.slot === slot)
    if (v && v.videoWidth > 0 && streamRef.current) {
      await new Promise((r) => requestAnimationFrame(() => r()))
      const rect = iframeEl.getBoundingClientRect()
      const sx = v.videoWidth / window.innerWidth, sy = v.videoHeight / window.innerHeight
      const cw = Math.max(1, Math.round(rect.width)), ch = Math.max(1, Math.round(rect.height))
      const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch)
      try { ctx.drawImage(v, rect.left * sx, rect.top * sy, rect.width * sx, rect.height * sy, 0, 0, cw, ch) } catch { /* noop */ }
      mine.forEach((p) => drawPinOnCanvas(ctx, (p.x / 100) * cw, (p.y / 100) * ch, p.label || ''))
      try { return canvas.toDataURL('image/jpeg', 0.85) } catch { /* noop */ }
    }
    return captureViaHtml2canvas(iframeEl, mine)
  }
  // 핀이 찍힌 폰들을 전부 찍어 첨부에 넣는다
  const captureAllPinned = async () => {
    const slotsWithPins = [...new Set(draftPins.map((p) => p.slot))]
    const out = []
    for (const s of slotsWithPins) { let d = ''; try { d = await captureSlot(s, draftPins) } catch { /* noop */ } if (d) out.push(d) }
    return out
  }
  const captureWithPins = async () => {
    if (!draftPins.length || busy) return
    if (!streamRef.current) await startShare()
    setBusy('캡처 중...')
    setPinMode(false)
    await new Promise((r) => setTimeout(r, 280))
    const imgs = await captureAllPinned()
    if (imgs.length) { setAttachImgs((p) => [...p, ...imgs]); capturedRef.current = true; setPreviewImg(imgs[0]) }
    setBusy('')
  }

  const entries = screenEntries || []
  const loadingEntries = screenEntries === null
  const unansweredIn = (items) => {
    const answered = new Set(items.filter((x) => x.replyTo).map((x) => x.replyTo))
    return items.filter((x) => !x.replyTo && (x.by === '형' || x.by === '대표님') && !answered.has(x.pid)).length
  }
  const curUnanswered = unansweredIn(entries)
  const totalUnanswered = curUnanswered
  const roots = entries.filter((e) => !e.replyTo)
  const replyOf = (root) => entries.filter((c) => c.replyTo && c.replyTo === root.pid)
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight }, [screenId, entries.length])

  const post = async () => {
    const text = draft.trim()
    if ((!text && !attachImgs.length && !draftPins.length) || sending) return
    setSending(true)
    try {
      let imgs = attachImgs
      if (draftPins.length > 0 && !capturedRef.current) {
        if (!streamRef.current) await startShare()
        setBusy('캡처 중...')
        await new Promise((r) => setTimeout(r, 300))
        const shots = await captureAllPinned()
        imgs = [...attachImgs, ...shots]
        setBusy('')
      }
      await postEntry({ screenId, by: author, text, imgs, pins: draftPins })
      setDraft(''); setAttachImgs([]); setDraftPins([]); setPinMode(false); capturedRef.current = false
    } catch (e) {
      alert('저장 실패: ' + (e?.message || e))
    } finally { setSending(false); setBusy('') }
  }

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
  const addPin = (slot, e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = +(((e.clientX - r.left) / r.width) * 100).toFixed(1)
    const y = +(((e.clientY - r.top) / r.height) * 100).toFixed(1)
    const label = `${author}${draftPins.length + 1}`
    const target = describeTarget(slot, e.clientX, e.clientY)
    setDraftPins((p) => [...p, { slot, x, y, label, target }])
    setFocus(slot)
  }
  const del = async (pid) => {
    if (!pid || !window.confirm('이 기록을 삭제할까요? (달린 댓글도 함께 삭제)')) return
    try { await deleteEntry(pid) } catch (e) { alert('삭제 실패: ' + (e?.message || e)) }
  }

  // ── 기록판 끌기 ──
  const onPanelDragStart = (e) => {
    if (e.target.closest('button, select, input, textarea')) return
    const el = panelRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    const move = (ev) => setPanelPos({ x: Math.max(0, Math.min(window.innerWidth - 120, ev.clientX - dragRef.current.dx)), y: Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - dragRef.current.dy)) })
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
    e.preventDefault()
  }

  const canPost = !!(draft.trim() || attachImgs.length || draftPins.length)

  const renderCard = (e, isReply, noReply) => {
    const st = BY_STYLE[e.by] || BY_STYLE['형']
    const { status, body } = isReply ? splitStatus(e.text) : { status: '', body: e.text }
    return (
      <div key={e.pid} style={{ marginLeft: isReply ? 22 : 0, padding: '11px 14px', borderRadius: 10, border: `1px solid ${st.line}`, background: st.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          {isReply && <span style={{ color: C.gray2, fontSize: 15, lineHeight: 1 }}>↳</span>}
          <b style={{ fontSize: 15, color: st.ink }}>{e.by}</b>
          <span style={{ fontSize: 13, color: C.gray2, fontVariantNumeric: 'tabular-nums' }}>{e.at}</span>
          {status && <b style={{ fontSize: 14, color: statusColor(status) }}>{status}</b>}
          {noReply && <span style={{ fontSize: 13, fontWeight: 700, color: CORAL }}>답글 없음</span>}
          <div style={{ flex: 1 }} />
          <button onClick={() => del(e.pid)} title="삭제" style={{ width: 20, height: 20, border: 'none', background: 'transparent', color: C.gray2, cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
        </div>
        {body && <div style={{ fontSize: 15, lineHeight: 1.6, color: C.ink, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{body}</div>}
        {e.imgs?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: body ? 8 : 0 }}>
            {e.imgs.map((src, k) => <img key={k} src={src} alt="첨부" onClick={() => setPreviewImg(src)} style={{ maxWidth: 200, maxHeight: 160, borderRadius: 6, border: `1px solid ${C.line}`, cursor: 'zoom-in', objectFit: 'cover' }} />)}
          </div>
        )}
        {e.pins?.length > 0 && (
          <button onClick={() => { setViewPins(e.pins); setPinMode(false) }} style={{ marginTop: 7, ...CHIP, padding: '3px 10px', fontSize: 14, color: CORAL, background: '#fff', border: `1px solid ${C.line}` }}>핀 {e.pins.length}개 위치 보기</button>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, color: C.ink, fontFamily: FONT, overflow: 'hidden' }}>
      <video ref={videoRef} muted autoPlay playsInline style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -9999, top: -9999 }} />
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,20,30,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={previewImg} alt="원본" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.45)', cursor: 'default' }} />
          <button onClick={() => setPreviewImg(null)} style={{ position: 'absolute', top: 18, right: 22, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.92)', color: C.ink, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: FONT }}>닫기 (ESC)</button>
        </div>
      )}

      {/* 상단바 */}
      <div style={{ flex: 'none', height: 52, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${PAD}px`, background: '#fff', borderBottom: `1px solid ${C.line}` }}>
        <b style={{ fontSize: 18 }}>홈프로 리뷰</b>
        <span style={{ fontSize: 14, color: C.gray }}>폰마다 다른 계정으로 로그인해 실제로 써 보면서 기록합니다. 비번은 전부 <b style={{ color: C.ink }}>{PASSWORD}</b></span>
        <div style={{ flex: 1 }} />
        {busy && <span style={{ fontSize: 14, fontWeight: 700, color: C.gray }}>{busy}</span>}
        {sharing && <span style={{ fontSize: 14, color: '#15803d', fontWeight: 700 }}>화면공유 중 <button onClick={stopShare} style={{ background: 'none', border: 'none', color: C.gray2, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: FONT }}>중지</button></span>}
        <button onClick={() => { setPinMode((v) => !v); setViewPins(null); if (!panelOpen) setPanelOpen(true) }} style={{ ...CHIP, border: `1px solid ${pinMode ? CORAL : C.line}`, background: pinMode ? CORAL : '#fff', color: pinMode ? '#fff' : C.ink2 }}>{pinMode ? '핀 찍는 중 · 폰을 클릭' : '핀 찍기'}</button>
        {draftPins.length > 0 && <span style={{ fontSize: 14, fontWeight: 700 }}>핀 {draftPins.length} <button onClick={() => setDraftPins([])} style={{ background: 'none', border: 'none', color: C.gray, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: FONT }}>지우기</button></span>}
        {viewPins && <button onClick={() => setViewPins(null)} style={{ ...CHIP, border: `1px solid ${C.line}`, background: '#fff', color: C.ink2 }}>핀 숨기기</button>}
        <button onClick={() => setGuideOpen((v) => !v)} style={{ ...CHIP, border: `1px solid ${C.line}`, background: guideOpen ? C.ink : '#fff', color: guideOpen ? '#fff' : C.ink2 }}>안내</button>
        <button onClick={() => setPanelOpen((v) => !v)} style={{ ...CHIP, border: `1px solid ${C.ink}`, background: panelOpen ? '#fff' : C.ink, color: panelOpen ? C.ink : '#fff' }}>
          기록판 {panelOpen ? '닫기' : '열기'}{totalUnanswered > 0 && <span style={NBADGE}>{totalUnanswered}</span>}
        </button>
      </div>

      {/* 폰 4개 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: GAP, padding: PAD, alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto' }}>
        {slots.map((uid, i) => {
          const a = SEED_ACCOUNTS.find((x) => x.uid === uid) || SEED_ACCOUNTS[0]
          const scr = routeToScreen(paths[i])
          const isFocus = focus === i
          const pinsHere = (pinMode ? draftPins : viewPins || []).filter((p) => p.slot === i)
          return (
            <div key={i} style={{ width: phoneW, flex: 'none', display: 'flex', flexDirection: 'column', gap: 8 }} onMouseDown={() => setFocus(i)}>
              {/* 칸 헤더: 역할 · 아이디 · 비번 */}
              <div style={{ ...CARD, borderRadius: 12, padding: '8px 10px', border: `1px solid ${isFocus ? C.ink : C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: C.ink, borderRadius: 6, padding: '1px 7px' }}>{i + 1}</span>
                  <b>{roleOf(a)}</b>
                  {uid === 'seed_B3' && <span style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>인증 공인중개사</span>}
                  <span>아이디 <b style={{ fontFamily: 'ui-monospace, monospace' }}>{loginIdOf(uid)}</b></span>
                  <span>비번 <b style={{ fontFamily: 'ui-monospace, monospace' }}>{PASSWORD}</b></span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 13, color: C.gray, overflow: 'hidden', textOverflow: 'ellipsis' }} title={paths[i]}>{scr ? scr.name : ''}</span>
                </div>
              </div>
              {/* 폰 */}
              <div style={{ position: 'relative', width: phoneW, height: phoneH, borderRadius: 22, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', background: '#fff' }}>
                <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <iframe ref={(el) => { iframeRefs.current[i] = el }} key={`${i}_${uid}`} name={`rvphone${i + 1}`} title={`폰 ${i + 1}`} src={LOGIN_PATH} style={{ width: PHONE_W, height: PHONE_H, border: 'none', pointerEvents: pinMode ? 'none' : 'auto' }} />
                </div>
                {(pinMode || viewPins) && (
                  <div onClick={pinMode ? (e) => addPin(i, e) : undefined} style={{ position: 'absolute', inset: 0, cursor: pinMode ? 'crosshair' : 'default', background: pinMode ? 'rgba(0,199,78,0.05)' : 'transparent' }}>
                    {pinsHere.map((p, k) => (
                      <div key={k} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -100%)', pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ background: CORAL, color: '#fff', fontSize: 13, fontWeight: 800, padding: '2px 7px', borderRadius: 7, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }}>{p.label || k + 1}</div>
                          <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${CORAL}` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 안내 — 계정·역할·오늘 볼 흐름 (형 지시 9/14 "리뷰 페이지에도 설명") */}
      {guideOpen && (
        <div style={{ position: 'fixed', top: 64, right: 16, width: 460, maxHeight: 'calc(100vh - 90px)', overflowY: 'auto', background: '#fff', border: `1px solid ${C.ink}`, zIndex: 60, padding: '16px 18px 20px', fontSize: 15, lineHeight: 1.6, color: C.ink, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <b style={{ fontSize: 17 }}>이 화면 쓰는 법</b>
            <span style={{ flex: 1 }} />
            <button onClick={() => setGuideOpen(false)} style={{ background: 'none', border: 'none', fontSize: 15, fontWeight: 700, color: C.gray2, cursor: 'pointer' }}>닫기</button>
          </div>
          <p style={{ margin: '0 0 10px' }}>폰 네 칸이 각각 다른 계정입니다. 로그인 화면에 칸 위의 아이디를 치고, 비번은 전부 <b>{PASSWORD}</b>. 같은 오더를 두 칸에서 접수자·홈프로로 나눠 보면 흐름이 한눈에 보입니다.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 14 }}>
            <tbody>
              {[['1 · a1', '접수자', '오더 접수, 캐시백 입금 확인, 후불 대금 지급 완료'], ['2 · b1', '홈프로', '수락(보험 없으면 막힘), 캐시백 송금, 체크인'], ['3 · b2', '홈프로', '비교선정 지원, 월 구독 결제'], ['4 · b3', '홈프로 · 인증 공인중개사', '공동중개 글 등록, 손님 카드 연결, 프로필 인증 표시']].map((r) => (
                <tr key={r[0]}>{r.map((x, i) => <td key={i} style={{ border: `1px solid ${C.line}`, padding: '6px 8px', fontWeight: i === 0 ? 700 : 400, whiteSpace: i < 2 ? 'nowrap' : 'normal' }}>{x}</td>)}</tr>
              ))}
            </tbody>
          </table>
          <b>오늘(9/14) 배포된 흐름 — 이 순서로 눌러 보면 됩니다</b>
          <ol style={{ margin: '6px 0 12px', paddingLeft: 20 }}>
            <li><b>캐시백 직거래</b> — a1이 오더 접수(캐시백 정액) → b1이 수락 → b1 오더 상세에 a1 계좌·금액과 [토스로 송금]·[계좌 복사]·[입금 완료] → a1에게 푸시 → a1 [입금 확인]. 체크인은 입금 확인과 무관하게 열려 있음(대표 9/14). 플랫폼은 돈을 안 만짐.</li>
            <li><b>보험(선택)</b> — 배정 뒤 오더 상세 "보험 적용" 섹션: 가입자는 자동 적용, 아니면 [건당 보험료 결제](토스 테스트 결제창)·[월·1년 가입]·"보험 없이 진행". 수락·체크인 조건 아님(대표 9/14).</li>
            <li><b>안심케어 탭</b> — 내 보험 상태, 가입 3종(1년 11만원 · 월 1.1만원 카드 자동결제 · 건당 1~2%), 사고 접수, 내 보험 관리. 값은 전부 임시.</li>
            <li><b>H-포인트 오더</b> — 단가유형 H-포인트로 접수하면 잔액 부족 시 접수 불가, 배정 순간 앱이 차감 보관, 완료 때 홈프로에게 배분.</li>
            <li><b>월 구독·차수</b> — 마이페이지 구독 관리(또는 메인 상단 차수 표시) → "H-포인트 사용하기" 체크 → 전액/직접 입력 → 나머지만 토스 결제 → 0차수(즉시 수락). 1차수는 2만P 보유(3분 뒤), 2차수는 무료(7분 뒤). 대기(보류) 오더도 메인에 보이되 수락은 안 됨.</li>
            <li><b>공동중개</b> — 탭 매물공유/손님공유/내 글, 지역·종류·거래형태 필터. 카드를 누르면 상세 시트에 [전화하기]·[채팅하기]. b3만 [등록]·손님공유 연결이 열리고 프로필에 "인증 공인중개사". 다른 계정은 "인증하러 갈까요" → 개설등록번호 화면. [내 글]에서 거래 종료.</li>
            <li><b>채팅 탭</b> — 전체·오더·거래장터·기술전수·공동중개. 오더 채팅은 오더명이 제목, 아래에 상대 이름과 마지막 대화.</li>
            <li><b>결제 내역</b> — 마이페이지 → 고객지원 → 결제 내역. 운영자 /admin → PG 결제 내역.</li>
            <li><b>셀프 등록 오더</b> — 접수 폼 "등록 방식 → 셀프 등록": 캐시백·홈프로 선택 없이 바로 배정, 보험 적용 후 체크인.</li>
          </ol>
          <b>아직 안 되는 것</b>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>토스는 테스트 키라 돈이 안 나갑니다(계약 뒤 실키). 웹에서 [토스로 송금]은 토스 앱이 없으면 아무 일도 안 일어납니다(앱에서 열어 주는 연결은 RN 쪽 작업).</li>
            <li>정보공유 오더, 보험 확정값(그룹 배정표·요율·월/년 보험료·보장한도), 구독 자동결제(토스 계약 뒤).</li>
          </ul>
          <p style={{ margin: '12px 0 0', color: C.gray2, fontSize: 14 }}>이상한 게 보이면 [기록판 열기]로 그 자리에서 적어 주세요. 핀을 찍으면 어느 폰의 어디인지 같이 남습니다.</p>
        </div>
      )}
      {/* 기록판 — 떠 있는 창 (끌어서 옮김) */}
      {panelOpen && (
        <div ref={panelRef} style={{ position: 'fixed', zIndex: 900, width: PANEL_W, maxWidth: 'calc(100vw - 24px)', height: Math.min(720, vh - 80), ...(panelPos ? { left: panelPos.x, top: panelPos.y } : { right: PAD, top: 52 + PAD }), ...CARD, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(20,30,45,0.22)' }}>
          <div onMouseDown={onPanelDragStart} style={{ ...CARD_HEAD, display: 'flex', alignItems: 'center', gap: 8, cursor: 'move', padding: '10px 12px', fontSize: 16 }}>
            <span style={{ flex: 'none' }}>기록</span>
            <span style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>{roots.length}건{curUnanswered > 0 && <b style={{ color: CORAL, marginLeft: 8 }}>답글 없음 {curUnanswered}</b>}</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => setPanelOpen(false)} style={{ ...CHIP, padding: '3px 8px', fontSize: 13, border: `1px solid ${C.line}`, background: '#fff', color: C.ink2 }}>닫기</button>
          </div>
          <div ref={listRef} className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loadingEntries ? <div style={{ color: C.gray, fontSize: 15, textAlign: 'center', padding: '20px 0' }}>기록 불러오는 중…</div>
              : roots.length === 0 ? <div style={{ color: C.gray, fontSize: 15, textAlign: 'center', padding: '20px 0' }}>아직 기록이 없습니다.</div>
              : roots.map((root) => { const reps = replyOf(root); const noReply = reps.length === 0 && (root.by === '형' || root.by === '대표님'); return <div key={root.pid} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{renderCard(root, false, noReply)}{reps.map((c) => renderCard(c, true, false))}</div> })}
          </div>
          <div style={{ flex: 'none', borderTop: `1px solid ${C.line}`, padding: '8px 10px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {['형', '대표님'].map((a) => { const on = author === a; const st = BY_STYLE[a]; return <button key={a} onClick={() => setAuthor(a)} style={{ ...CHIP, padding: '3px 10px', fontSize: 14, border: `1px solid ${on ? st.ink : C.line}`, background: on ? st.ink : '#fff', color: on ? '#fff' : C.ink2 }}>{a}</button> })}
              <div style={{ flex: 1 }} />
              {draftPins.length > 0 && <button onClick={captureWithPins} disabled={!!busy} style={{ ...CHIP, padding: '3px 10px', fontSize: 14, border: `1px solid ${C.ink}`, background: C.ink, color: '#fff' }}>핀 박아 캡처</button>}
              <label style={{ ...CHIP, padding: '3px 10px', fontSize: 14, border: `1px solid ${C.line}`, background: '#fff', color: C.ink2 }}>스샷 첨부<input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = '' }} /></label>
            </div>
            {attachImgs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {attachImgs.map((src, k) => (
                  <div key={k} style={{ position: 'relative' }}>
                    <img src={src} alt="첨부" onClick={() => setPreviewImg(src)} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.line}`, cursor: 'zoom-in' }} />
                    <button onClick={() => setAttachImgs((p) => p.filter((_, j) => j !== k))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', border: 'none', background: C.ink, color: '#fff', fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.nativeEvent?.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); post() } }}
                onPaste={onPasteImg} rows={3}
                placeholder={draftPins.length ? `핀 ${draftPins.length}개 — 번호로 적으면 됩니다 (등록하면 그 폰이 자동 캡처됩니다)` : `${author}(으)로 기록 · 스샷 Ctrl+V · Enter 전송 · Shift+Enter 줄바꿈`}
                style={{ flex: 1, resize: 'none', borderRadius: 8, border: `1px solid ${C.line2}`, outline: 'none', padding: '8px 10px', fontSize: 15, lineHeight: 1.5, fontFamily: FONT, color: C.ink }} />
              <button onClick={post} disabled={sending || !canPost} style={{ flex: 'none', padding: '0 16px', borderRadius: 8, border: 'none', background: canPost ? C.ink : C.line, color: '#fff', fontSize: 15, fontWeight: 800, cursor: canPost ? 'pointer' : 'default', fontFamily: FONT }}>기록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const C = { ink: '#2b3440', ink2: '#3a4351', gray: '#566070', gray2: '#98a2b0', line: '#e6e9ee', line2: '#d6dbe2', bg: '#f7f8fa', card: '#ffffff' }
const NBADGE = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, marginLeft: 5, padding: '0 5px', borderRadius: 9, background: CORAL, color: '#fff', fontSize: 13, fontWeight: 800, lineHeight: 1, verticalAlign: 'middle' }
const BY_STYLE = {
  형: { ink: '#2b3440', line: '#e6e9ee', bg: '#ffffff' },
  대표님: { ink: '#c05621', line: '#f3d8c4', bg: '#fffaf5' },
  카스: { ink: '#3b6ea5', line: '#d3e0ec', bg: '#f4f8fc' },
}
const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif"
const CHIP = { fontSize: 14, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: FONT }
const CARD = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: '0 1px 2px rgba(20,30,45,0.05), 0 6px 18px rgba(20,30,45,0.04)' }
const CARD_HEAD = { flex: 'none', padding: '13px 16px', background: '#f8fafb', borderBottom: `1px solid ${C.line}`, borderTopLeftRadius: 16, borderTopRightRadius: 16, fontSize: 17, fontWeight: 800 }
