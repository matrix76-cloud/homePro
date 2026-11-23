/* eslint-disable */
/**
 * 채팅 탭 맨 위 롤링 배너 (대표 리뷰 11/19)
 *  · 기본 3장 — 마이 탭의 기술전수 수강생모집 / 거래장터 / 양도·매매 로 가는 길 (문구 · 경로는 마이 탭 메뉴 그대로)
 *  · 관리자 > 광고관리 > 채팅 상단 배너(ads.position === "채팅상단")에 올린 배너가 앞에 붙어 같이 돈다
 *    (이벤트 · 공지 · 파트너십 안내용). 보이는 조건: 활성 + 시작일 ~ 종료일 안.
 *  · 5초마다 넘어가고, 손으로 밀어 넘길 수 있고, 아래 점으로 몇 번째인지 보인다.
 *  · 그림: icons8 3D Fluency (public/assets/chat-banner)
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, query, where, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../api/config";
import { THEME } from "../config/homeproConfig";
import { isInRnWebView } from "../bridge/webviewBridge";

export const CHAT_BANNER_POSITION = "채팅상단";
const ART = "/assets/chat-banner/";
export const CHAT_BANNER_FALLBACK_IMG = ART + "notice.png"; // 관리자 배너에 그림이 없을 때
const ROLL_MS = 5000;
const CACHE_MS = 5 * 60 * 1000;
const LOAD_WAIT_MS = 2000; // 관리자 배너를 이만큼 기다리고, 늦으면 기본 3장부터 보여 준다

// 마이 탭(MobileConfigpage)의 메뉴 이름 · 설명 · 경로와 같게 둔다
export const DEFAULT_CHAT_BANNERS = [
  { id: "training", title: "기술전수 수강생 모집", desc: "교육 공고를 등록하고 수강생을 모집하세요", to: "/education-market?seg=training&only=1", img: ART + "training.png" },
  { id: "supplies", title: "거래장터", desc: "자재 · 장비 · 소모품", to: "/education-market?seg=supplies&only=1", img: ART + "supplies.png" },
  { id: "market", title: "양도·매매", desc: "사업장 · 팀인력 · 영업권 DB", to: "/education-market?seg=market&only=1", img: ART + "market.png" },
];

const toMs = (v) => {
  if (!v) return null;
  const d = v.toDate ? v.toDate() : new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
};

/** 지금 보여도 되는 배너인가 — 활성이고 시작일 ~ 종료일 안 (관리자 화면의 '활성' 판정과 같은 기준) */
export function isAdLive(ad, now = Date.now()) {
  if (!ad || ad.active === false) return false;
  const s = toMs(ad.startDate);
  const e = toMs(ad.endDate);
  if (s != null && s > now) return false;
  if (e != null && e < now) return false;
  return true;
}

let adsCache = null;
let adsCacheAt = 0;

async function loadChatAds() {
  if (adsCache && Date.now() - adsCacheAt < CACHE_MS) return adsCache;
  const snap = await getDocs(query(collection(db, "ads"), where("position", "==", CHAT_BANNER_POSITION)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0)); // 최근에 올린 것부터
  adsCache = list;
  adsCacheAt = Date.now();
  return list;
}

// 앱(RN 웹뷰)은 새 창을 못 연다 — 껍데기에 넘겨 폰 브라우저로 연다 (ChatDetailPage openOutside 와 같은 방식)
const openOutside = (url) => {
  if (isInRnWebView()) {
    try { window.ReactNativeWebView.postMessage("open::" + encodeURI(url)); } catch (e) {}
    return;
  }
  window.open(url, "_blank", "noopener");
};

/** 배너 한 장 — 왼쪽 글씨 두 줄 + 오른쪽 그림. 관리자 미리보기에서도 같이 쓴다 */
export function ChatBannerSlide({ title, desc, img, photo, onClick, withDots }) {
  const asButton = onClick ? { as: "button", type: "button", onClick } : {};
  return (
    <Slide {...asButton} $clickable={!!onClick} $withDots={withDots}>
      <Texts>
        <Title>{title}</Title>
        {desc ? <Desc>{desc}</Desc> : null}
      </Texts>
      <Art src={img || CHAT_BANNER_FALLBACK_IMG} alt="" $photo={photo} draggable={false} onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = "1"; e.currentTarget.src = CHAT_BANNER_FALLBACK_IMG; } }} />
    </Slide>
  );
}

/** 관리자 등록 창 미리보기 — 실제 배너와 같은 틀 한 장 */
export function ChatBannerPreview({ title, desc, imageUrl }) {
  return (
    <Frame style={{ margin: 0 }}>
      <ChatBannerSlide title={title || "제목"} desc={desc} img={imageUrl || CHAT_BANNER_FALLBACK_IMG} photo={!!imageUrl} />
    </Frame>
  );
}

/**
 * @param {boolean} hideInsurance  PG 심사 계정처럼 보험을 가리는 화면이면 보험으로 가는 관리자 배너는 뺀다
 */
export default function ChatTopBanner({ hideInsurance = false }) {
  const navigate = useNavigate();
  const fresh = adsCache && Date.now() - adsCacheAt < CACHE_MS;
  const [ads, setAds] = useState(fresh ? adsCache : null); // null = 아직 받는 중
  const [idx, setIdx] = useState(0);
  const scroller = useRef(null);
  const idxRef = useRef(0);
  const holdUntil = useRef(0); // 손으로 만진 뒤 잠깐은 자동 넘김을 쉰다

  useEffect(() => {
    if (ads) return;
    let alive = true;
    const timer = setTimeout(() => { if (alive) setAds((prev) => prev || []); }, LOAD_WAIT_MS);
    loadChatAds()
      .then((list) => { if (alive) setAds(list); })
      .catch(() => { if (alive) setAds((prev) => prev || []); })
      .finally(() => clearTimeout(timer));
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const slides = useMemo(() => {
    if (!ads) return null;
    const now = Date.now();
    const fromAdmin = ads
      .filter((a) => isAdLive(a, now) && String(a.title || "").trim())
      .filter((a) => !(hideInsurance && /보험|insurance/i.test(`${a.title || ""} ${a.desc || ""} ${a.linkUrl || ""}`)))
      .map((a) => ({
        id: "ad_" + a.id, adId: a.id,
        title: String(a.title).trim(), desc: String(a.desc || "").trim(),
        to: String(a.linkUrl || "").trim(), img: String(a.imageUrl || "").trim(), photo: !!String(a.imageUrl || "").trim(),
      }));
    return [...fromAdmin, ...DEFAULT_CHAT_BANNERS];
  }, [ads, hideInsurance]);

  const count = slides ? slides.length : 0;

  const scrollToIdx = (i, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const left = i * el.clientWidth;
    try { el.scrollTo({ left, behavior: smooth ? "smooth" : "auto" }); } catch (e) { el.scrollLeft = left; }
  };

  // 5초마다 다음 장 — 화면이 가려져 있거나 방금 손으로 만졌으면 건너뛴다
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (Date.now() < holdUntil.current) return;
      scrollToIdx((idxRef.current + 1) % count);
    }, ROLL_MS);
    return () => clearInterval(t);
  }, [count]);

  // 창 폭이 바뀌면 지금 장에 다시 맞춘다
  useEffect(() => {
    const onResize = () => scrollToIdx(idxRef.current, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 장 수가 줄어 지금 번호가 밖으로 나가면 처음으로
  useEffect(() => {
    if (count && idxRef.current >= count) { idxRef.current = 0; setIdx(0); scrollToIdx(0, false); }
  }, [count]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    const i = Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== idxRef.current) { idxRef.current = i; setIdx(i); }
  };
  const hold = () => { holdUntil.current = Date.now() + ROLL_MS; };

  const go = (s) => {
    const to = String(s.to || "").trim();
    if (!to) return;
    if (s.adId) updateDoc(doc(db, "ads", s.adId), { clicks: increment(1) }).catch(() => {});
    if (/^https?:\/\//i.test(to)) {
      // 우리 앱과 같은 주소면 앱 안에서 이동, 바깥 주소는 바깥에서 연다
      try {
        const u = new URL(to);
        if (u.origin === window.location.origin) { navigate(u.pathname + u.search + u.hash); return; }
      } catch (e) {}
      openOutside(to);
      return;
    }
    navigate(to.startsWith("/") ? to : "/" + to);
  };

  if (!slides) return <Frame aria-hidden="true"><Placeholder /></Frame>; // 받는 동안 자리만 잡아 둔다
  if (count === 0) return null;

  return (
    <Frame>
      <Scroller ref={scroller} onScroll={onScroll} onTouchStart={hold} onTouchMove={hold} onMouseDown={hold}>
        {slides.map((s) => (
          <ChatBannerSlide
            key={s.id}
            title={s.title}
            desc={s.desc}
            img={s.img}
            photo={s.photo}
            withDots={count > 1}
            onClick={s.to ? () => go(s) : undefined}
          />
        ))}
      </Scroller>
      {count > 1 && (
        <Dots>
          {slides.map((s, i) => (
            <DotBtn key={s.id} type="button" aria-label={`${i + 1}번째 배너`} onClick={() => { hold(); scrollToIdx(i); }}>
              <Dot $on={i === idx} />
            </DotBtn>
          ))}
        </Dots>
      )}
    </Frame>
  );
}

/* ─── 모양 ─── */

const BANNER_MIN_H = 92;

const Frame = styled.div`
  position: relative;
  margin: 12px 12px 0;
  border-radius: 12px;
  border: 1px solid #DCEFE4;
  background: linear-gradient(120deg, #F4FBF7 0%, ${THEME.buttonLight} 100%);
  overflow: hidden;
`;

const Placeholder = styled.div`
  height: ${BANNER_MIN_H}px;
`;

const Scroller = styled.div`
  display: flex; /* 장마다 높이를 가장 긴 장에 맞춘다 — 넘어갈 때 높이가 흔들리지 않게 */
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Slide = styled.div`
  flex: 0 0 100%;
  min-width: 0;
  min-height: ${BANNER_MIN_H}px;
  box-sizing: border-box;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: ${({ $withDots }) => ($withDots ? "12px 16px 22px 18px" : "12px 16px 12px 18px")};
  margin: 0;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  -webkit-tap-highlight-color: transparent;
  &:focus { outline: none; }
`;

const Texts = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.div`
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  color: ${THEME.text};
  word-break: keep-all;
  overflow-wrap: anywhere;
`;

const Desc = styled.div`
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: ${THEME.textSecondary};
  word-break: keep-all;
  overflow-wrap: anywhere;
`;

const Art = styled.img`
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  /* 기본 그림(투명 배경 일러스트)은 통째로, 관리자가 올린 그림 · 사진은 칸에 채운다 */
  object-fit: ${({ $photo }) => ($photo ? "cover" : "contain")};
  border-radius: ${({ $photo }) => ($photo ? "10px" : "0")};
  user-select: none;
  pointer-events: none;
`;

const Dots = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  display: flex;
  justify-content: center;
  gap: 0;
  pointer-events: none;
`;

const DotBtn = styled.button`
  pointer-events: auto;
  padding: 6px 4px;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
  line-height: 0;
  -webkit-tap-highlight-color: transparent;
  &:focus { outline: none; }
`;

const Dot = styled.span`
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $on }) => ($on ? THEME.primary : "rgba(0, 150, 63, 0.22)")};
  transition: background 0.2s;
`;
