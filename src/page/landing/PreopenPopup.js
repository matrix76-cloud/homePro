/**
 * 그랜드 오픈 사전예약 팝업 — 홍보 화면(랜딩)에 들어온 사람에게 뜬다 (대표 리뷰 11/22 "최종 시안", 문구 그대로)
 *  · 제목은 세 줄 "그랜드오픈 / (오픈 날짜) / 지금 사전예약 중" (대표 11/25 — 앞서는 "(날짜) 그랜드 오픈 사전예약 시작")
 *  · 오픈 날짜 문구 · 켜고 끄기 · 초대코드는 관리자 설정(settings/preopenPopup)에서 바꾼다. 못 읽으면 PREOPEN_DEFAULT.
 *    (대표가 오픈 날짜를 따로 확정하기로 해서 날짜만 설정으로 뺐다 — 관리자 > 설정 > 정관/약관 관리 > 사전예약 팝업)
 *  · 혜택의 포인트 숫자는 포인트 규칙(settings/point_rules) 운영값 — referral_signup(가입한 사람) · referral_invite(초대한 사람)
 *  · 주 버튼 = 초대코드를 이 기기에 담아 두고(homepro.pendingReferralCode) 로그인 화면으로.
 *    처음 로그인한 사람은 가입 2단계(업체명 · 대화명)의 추천인 코드 칸에 이 코드가 미리 들어가 있다.
 *    ★주소에 ?code= 를 붙이는 길은 쓰지 않는다 — index.js 는 회원 코드 꼴(영문 2 + 숫자 6)만 받고,
 *      로그인 화면은 ?code= 를 카카오 로그인 복귀로 읽는다.
 *  · 로그인한 회원 · 앱(웹뷰) 안에서는 띄우지 않는다. [오늘 하루 보지 않기]는 그날(한국 날짜) 동안만.
 *  · 대표 문구의 이모지(열쇠 · 화살표)는 같은 뜻의 아이콘으로 바꿔 넣었다.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiArrowRight, FiCheck, FiKey, FiX } from 'react-icons/fi';
import { db } from '../../api/config';
import { useAuth } from '../../context/AuthContext';
import { isInRnWebView } from '../../bridge/webviewBridge';

export const PREOPEN_DEFAULT = { enabled: true, openDateText: '12월 14일(월) 09:00', code: 'HOMEPRO2026' };
const HIDE_KEY = 'homepro.preopenPopup.hideDay';
const PENDING_CODE_KEY = 'homepro.pendingReferralCode';
const POINT_FALLBACK = 3000;

const kstDay = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const hiddenToday = () => { try { return localStorage.getItem(HIDE_KEY) === kstDay(); } catch (e) { return false; } };
const pt = (n) => Number(n || POINT_FALLBACK).toLocaleString('ko-KR');

/** 글자 복사 — 권한이 막힌 브라우저(http · 옛 웹뷰)에서는 임시 입력칸으로 */
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* 아래 방법으로 */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

// 미리보기 — 주소 끝에 ?preopen=preview 를 붙이면 꺼 둔 상태 · 코드 미등록 · 로그인 중이어도 모양을 볼 수 있다 (관리자 확인용)
const isPreview = () => {
  try { return new URLSearchParams(window.location.search).get('preopen') === 'preview'; } catch (e) { return false; }
};

const PreopenPopup = () => {
  const navigate = useNavigate();
  const preview = isPreview();
  const { loading, isLoggedIn } = useAuth();
  const [conf, setConf] = useState(null); // 설정을 읽은 뒤에만 띄운다 — 꺼 둔 팝업이 잠깐 떴다 사라지지 않게
  const [points, setPoints] = useState({ signup: POINT_FALLBACK, invite: POINT_FALLBACK });
  const [closed, setClosed] = useState(() => (isPreview() ? false : hiddenToday()));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (closed) return undefined;
    let alive = true;
    (async () => {
      let next = { ...PREOPEN_DEFAULT };
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'preopenPopup'));
        if (snap.exists()) {
          const d = snap.data() || {};
          next = {
            enabled: d.enabled !== false,
            openDateText: String(d.openDateText || '').trim() || PREOPEN_DEFAULT.openDateText,
            code: String(d.code || '').trim().toUpperCase() || PREOPEN_DEFAULT.code,
          };
        }
      } catch (e) { /* 못 읽으면 기본값 */ }
      // 코드가 실제로 등록돼 있을 때만 띄운다 — 등록 안 된 코드를 알리면 가입 때 "존재하지 않는 코드"가 나온다.
      // (공식 코드 문서는 scripts/seed-official-code.mjs --write 로 만든다. 못 읽은 경우도 띄우지 않는다)
      if (next.enabled && !preview) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const codeSnap = await getDoc(doc(db, 'referral_codes', next.code));
          const c = codeSnap.exists() ? codeSnap.data() || {} : null;
          if (!c || c.official !== true || c.active === false) next = { ...next, enabled: false };
        } catch (e) { next = { ...next, enabled: false }; }
      }
      if (alive) setConf(next);
      try {
        const { getAllPointRules } = await import('../../service/PointService');
        const rules = await getAllPointRules();
        const pick = (r) => (r && r.active !== false && Number(r.amount) > 0 ? Number(r.amount) : POINT_FALLBACK);
        if (alive) setPoints({ signup: pick(rules?.referral_signup), invite: pick(rules?.referral_invite) });
      } catch (e) { /* 기본값 */ }
    })();
    return () => { alive = false; };
  }, [closed, preview]);

  const show = !closed && !!conf && (preview || (conf.enabled && !loading && !isLoggedIn && !isInRnWebView()));

  // 떠 있는 동안 뒤 화면이 따라 움직이지 않게
  useEffect(() => {
    if (!show) return undefined;
    const html = document.documentElement;
    const prev = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setClosed(true); };
    window.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
      window.removeEventListener('keydown', onKey);
    };
  }, [show]);

  if (!show) return null;

  const close = () => setClosed(true);
  const hideToday = () => {
    try { localStorage.setItem(HIDE_KEY, kstDay()); } catch (e) { /* 저장이 막혀도 이번엔 닫는다 */ }
    setClosed(true);
  };
  const copyCode = async () => {
    const ok = await copyText(conf.code);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  const goSignup = () => {
    // 친구 초대 링크로 들어와 이미 담긴 코드가 있으면 그대로 둔다 — 덮어쓰면 초대한 사람이 보상을 못 받는다
    try {
      if (!localStorage.getItem(PENDING_CODE_KEY)) localStorage.setItem(PENDING_CODE_KEY, conf.code);
    } catch (e) { /* 못 담으면 가입 화면에서 직접 입력 */ }
    setClosed(true);
    navigate('/MobileLogin');
  };

  const benefits = [
    `제시된 초대코드 입력 후 간편가입 시 즉시 ${pt(points.signup)}P 지급`,
    `동료 사업자 초대할 때마다 건당 +${pt(points.invite)}P 무제한 추가 적립`,
    '오픈 당일 앱 다운로드 후 회원가입 시 실시간 수·발주 즉시 개시',
    '누구나 초 간편·실속 보험료로 도급업자 배상책임보험 가입',
  ];

  return (
    <Overlay onClick={close}>
      <Box role="dialog" aria-modal="true" aria-labelledby="preopen-title" onClick={(e) => e.stopPropagation()}>
        <CloseX type="button" onClick={close} aria-label="닫기"><FiX /></CloseX>
        <Scroll>
          <Brand>청소·설비 등 30개 업종 최초의 오더공유 플랫폼!, 홈프로!</Brand>
          <Title id="preopen-title">
            <span>그랜드오픈</span>
            <span>{conf.openDateText}</span>
            <span>지금 사전예약 중</span>
          </Title>
          <Desc>30개 전문 분야 · 300여 세부 종목 사장님과 기술자가 모이는 실시간 오더공유 · 현장구인 플랫폼이 열립니다.</Desc>

          <SubTitle>사전예약 특별 혜택</SubTitle>
          <BenefitTable>
            {benefits.map((b, i) => (
              <BenefitRow key={i}>
                <BenefitK>혜택 {i + 1}</BenefitK>
                <BenefitV>{b}</BenefitV>
              </BenefitRow>
            ))}
          </BenefitTable>

          <CodeBox>
            <CodeLabel><FiKey aria-hidden />공식 사전예약 초대코드</CodeLabel>
            <CodeRow>
              <Code>{conf.code}</Code>
              <CopyBtn type="button" onClick={copyCode} $done={copied}>
                {copied ? <><FiCheck aria-hidden />복사됨</> : '복사하기'}
              </CopyBtn>
            </CodeRow>
          </CodeBox>
        </Scroll>
        <Foot>
          <MainBtn type="button" onClick={goSignup}>
            <span>30초 간편가입으로 사전예약하고 {pt(points.signup)}P 받기</span>
            <FiArrowRight aria-hidden />
          </MainBtn>
          <FootRow>
            <TextBtn type="button" onClick={hideToday}>오늘 하루 보지 않기</TextBtn>
            <TextBtn type="button" onClick={close}>닫기</TextBtn>
          </FootRow>
        </Foot>
      </Box>
    </Overlay>
  );
};

export default PreopenPopup;

/* ============ 모양 — 랜딩과 같은 색 · 선 ============ */
const PRIMARY = '#00963F';
const INK = '#14181F';
const BODY = '#2b2f36';
const LINE = '#dfe3e8';

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 2000; /* PC 위 메뉴(1200)보다 위 */
  background: rgba(20, 24, 31, 0.56);
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box;
`;
const Box = styled.div`
  position: relative; width: 100%; max-width: 500px;
  max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
  display: flex; flex-direction: column; overflow: hidden;
  background: #fff; border: 1px solid ${LINE}; border-radius: 16px;
  box-shadow: 0 24px 60px rgba(20, 24, 31, 0.28);
  color: ${INK}; word-break: keep-all; text-align: left;
`;
const CloseX = styled.button`
  position: absolute; top: 10px; right: 10px; z-index: 1;
  width: 44px; height: 44px; border: none; background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 24px; color: ${INK};
  &:hover { color: ${PRIMARY}; }
`;
const Scroll = styled.div`
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  padding: 30px 28px 22px;
  @media (max-width: 600px) { padding: 26px 20px 18px; }
`;
const Brand = styled.p`
  margin: 0 44px 10px 0; font-size: 16px; font-weight: 700; line-height: 1.5; color: ${PRIMARY};
`;
const Title = styled.h2`
  margin: 0 0 12px; font-size: 27px; font-weight: 800; line-height: 1.35; letter-spacing: -0.02em; color: ${INK};
  text-wrap: balance;
  span { display: block; } /* 세 줄 — 그랜드오픈 / 날짜 / 지금 사전예약 중 */
  @media (max-width: 600px) { font-size: 23px; }
`;
const Desc = styled.p`
  margin: 0 0 22px; font-size: 16px; line-height: 1.65; color: ${BODY};
  @media (max-width: 600px) { font-size: 15px; }
`;
const SubTitle = styled.h3` margin: 0 0 10px; font-size: 17px; font-weight: 800; color: ${INK}; `;
const BenefitTable = styled.div` border: 1px solid ${LINE}; border-radius: 12px; overflow: hidden; background: #fff; `;
const BenefitRow = styled.div`
  display: grid; grid-template-columns: 76px 1fr;
  & + & { border-top: 1px solid ${LINE}; }
`;
const BenefitK = styled.div`
  padding: 13px 0; font-size: 15px; font-weight: 800; color: ${INK}; background: #f3f4f7;
  display: flex; align-items: center; justify-content: center; white-space: nowrap;
`;
const BenefitV = styled.div` padding: 13px 14px; font-size: 15px; line-height: 1.55; color: ${INK}; `;
const CodeBox = styled.div` margin-top: 16px; border: 1px solid ${LINE}; border-radius: 12px; padding: 14px 16px; background: #fff; `;
const CodeLabel = styled.div`
  display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700; color: ${INK}; margin-bottom: 8px;
  svg { font-size: 17px; color: ${PRIMARY}; flex-shrink: 0; }
`;
const CodeRow = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; `;
const Code = styled.div` font-size: 24px; font-weight: 800; color: ${INK}; letter-spacing: 0.01em; `;
const CopyBtn = styled.button`
  display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 16px;
  border: 1px solid ${({ $done }) => ($done ? PRIMARY : LINE)}; border-radius: 10px; background: #fff; cursor: pointer;
  font-family: inherit; font-size: 15px; font-weight: 700; color: ${({ $done }) => ($done ? PRIMARY : INK)};
  &:hover { border-color: ${PRIMARY}; color: ${PRIMARY}; }
`;
const Foot = styled.div`
  flex: 0 0 auto; border-top: 1px solid ${LINE}; padding: 14px 28px 10px; background: #fff;
  @media (max-width: 600px) { padding: 12px 20px 8px; }
`;
const MainBtn = styled.button`
  width: 100%; min-height: 56px; padding: 12px 18px; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: none; border-radius: 10px; background: ${PRIMARY}; color: #fff; cursor: pointer;
  font-family: inherit; font-size: 17px; font-weight: 800; line-height: 1.4; text-align: center;
  svg { font-size: 20px; flex-shrink: 0; }
  &:hover { background: #007A33; }
  @media (max-width: 600px) { font-size: 16px; }
`;
const FootRow = styled.div` display: flex; align-items: center; justify-content: space-between; margin-top: 4px; `;
const TextBtn = styled.button`
  min-height: 44px; padding: 0 4px; border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 15px; font-weight: 600; color: ${BODY};
  &:hover { color: ${PRIMARY}; text-decoration: underline; }
`;
