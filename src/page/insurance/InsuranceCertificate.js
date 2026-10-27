/**
 * 배상책임보험 — 가입 완료 · 보장 증서 · 홍보용 엠블럼 (대표 기획안 10/26 · 시안 insurance-step3 2번 / insurance-manage 1번)
 *   증서와 엠블럼은 서버 발급 문서가 아니라 화면 표시용이다 — 고객에게 보여 주거나 캡처해 보관한다.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { IoCheckmark, IoRibbonOutline, IoDownloadOutline, IoDocumentTextOutline, IoCloseOutline } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { formatDate, won } from "../../service/InsuranceService";
import { LIMIT_SHORT } from "./insuranceGroups";
import { C, Box, H, Row, Txt, Btn, Shield } from "./InsuranceBlocks";

/* 내 가입 보장 증서 — policy 모양({ group, startAt, endAt, price, billing.nextChargeAt }) 또는 서버 반환값 */
export const Certificate = ({ name, p }) => {
  const next = p?.nextChargeAt || p?.billing?.nextChargeAt;
  const renewing = p?.autoRenew !== false;
  return (
    <Box>
      <H icon={IoRibbonOutline}>내 가입 보장 증서</H>
      <Row k="파트너명" v={`${name || "-"}${p?.group ? ` (${p.group}그룹)` : ""}`} />
      <Row k="보장 기간" v={`${formatDate(p?.startAt) || "오늘"} ~ ${formatDate(p?.endAt) || "-"}`} sub={renewing ? "매월 자동 갱신" : "자동 갱신 해지됨"} />
      <Row k="보장 한도" v={LIMIT_SHORT} sub="자기부담금 일반 30만원 (사다리차 50만 · 이사 100만)" />
      <Row k="다음 결제일" v={renewing && next ? `${formatDate(next)}${p?.amount || p?.price ? ` (${won(p.amount || p.price)})` : ""}` : "없음"} last />
    </Box>
  );
};

/* 가입 완료 — /pay/billing-success 의 보험 가입 */
export const InsuranceDone = ({ info }) => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const name = userData?.name || userData?.nickname || "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.TINT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><IoCheckmark size={36} color={C.P} /></div>
        <div style={{ fontSize: 21, fontWeight: 700, color: C.TXT }}>가입이 완료되었습니다</div>
        <Txt style={{ marginTop: 6, textAlign: "center" }}>오늘부터 현장 사고 위험 없이 안전하게 작업하세요.</Txt>
      </div>
      <Certificate name={name} p={info} />
      {(info?.cardCompany || info?.cardNumberMasked) && <Txt style={{ fontSize: 14 }}>결제 카드: {`${info.cardCompany || ""} ${info.cardNumberMasked || ""}`.trim()}</Txt>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Btn ghost small onClick={() => navigate("/insurance/my?show=emblem")}><IoDownloadOutline size={18} />가입업체 마크</Btn>
        <Btn ghost small onClick={() => navigate("/insurance/my?show=cert")}><IoDocumentTextOutline size={18} />가입 증명서</Btn>
      </div>
    </div>
  );
};

/* 홍보용 엠블럼 — SVG 한 장. 받기는 PNG 로 */
const EMBLEM_SVG = (name) => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#ffffff"/>
<g transform="translate(180,70) scale(2.5)">
<path d="M48 8 L80 20 V44 C80 66 66 80 48 88 C30 80 16 66 16 44 V20 Z" fill="#fff" stroke="#00963F" stroke-width="3"/>
<path d="M48 18 L71 27 V45 C71 61 61 72 48 78 C35 72 25 61 25 45 V27 Z" fill="#E6F7EE"/>
<path d="M36 47 l8 8 l16 -18" stroke="#00963F" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<text x="300" y="365" text-anchor="middle" font-family="Pretendard, 'Malgun Gothic', sans-serif" font-size="40" font-weight="700" fill="#14181F">1억 배상책임 가입업체</text>
<text x="300" y="420" text-anchor="middle" font-family="Pretendard, 'Malgun Gothic', sans-serif" font-size="28" fill="#2b2f36">${String(name || "").replace(/[<&>]/g, "")}</text>
<text x="300" y="520" text-anchor="middle" font-family="Pretendard, 'Malgun Gothic', sans-serif" font-size="26" font-weight="600" fill="#00963F">홈프로 도급업자 배상책임보험</text>
</svg>`;

const downloadEmblem = (name) => {
  const svg = EMBLEM_SVG(name);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas"); cv.width = 600; cv.height = 600;
    cv.getContext("2d").drawImage(img, 0, 0);
    const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "homepro_insured_emblem.png";
    document.body.appendChild(a); a.click(); a.remove();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/* 아래에서 올라오는 창 */
export const Sheet = ({ title, onClose, children }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", background: C.SOFT, borderRadius: "14px 14px 0 0", padding: "16px 18px 28px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.TXT }}>{title}</span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><IoCloseOutline size={26} color={C.TXT} /></button>
      </div>
      {children}
    </div>
  </div>
);

export const EmblemSheet = ({ name, onClose }) => (
  <Sheet title="홍보용 엠블럼" onClose={onClose}>
    <Box style={{ textAlign: "center" }}>
      <Shield size={120} />
      <div style={{ fontSize: 20, fontWeight: 700, color: C.TXT, marginTop: 6 }}>1억 배상책임 가입업체</div>
      <Txt style={{ textAlign: "center" }}>{name}</Txt>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.P, marginTop: 8 }}>홈프로 도급업자 배상책임보험</div>
    </Box>
    <Txt style={{ fontSize: 14 }}>견적서 · 명함 · 블로그에 붙여 고객 신뢰를 높이세요. 보장이 끝나면 쓰지 말아 주세요.</Txt>
    <Btn onClick={() => downloadEmblem(name)}><IoDownloadOutline size={20} />이미지로 받기</Btn>
  </Sheet>
);

export const CertSheet = ({ name, policy, onClose }) => (
  <Sheet title="모바일 가입 증명서" onClose={onClose}>
    <Certificate name={name} p={policy} />
    <Txt style={{ fontSize: 14 }}>고객이 가입 여부를 물으면 이 화면을 보여 주세요. 공식 증권은 보험사 확정 후 따로 발급됩니다.</Txt>
  </Sheet>
);
