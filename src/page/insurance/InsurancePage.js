/**
 * 홈프로 도급배상책임보험 — /insurance (하단탭 보험)
 *
 * 대표 기획안 10/26 · 형 시안 선택 10/27 (/lab?tab=insurance 소개 화면 2번 "요금 먼저 · 자세한 건 접기")
 *   메인 비주얼 → 업종별 월 요금 2×2 → 보상 한도 · 보상 범위 · 자기부담금 · 보장 개시 조건(눌러서 펼침)
 *   아래 고정 줄: [1:1 문의] [사고접수] [카드 등록하고 1분 만에 가입] → /insurance/join (가입 3단계)
 *   가입은 월 정기결제만 — 건당 · 연간 결제는 생략 (대표 10/26). 건당 보험은 오더 진행 화면에서만 그대로 쓴다.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChatbubbleEllipsesOutline, IoAlertCircleOutline, IoChevronForward, IoDocumentTextOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { useAuth } from "../../context/AuthContext";
import { getInsuranceSettings, getMyPolicies, pickActivePolicy, formatDate } from "../../service/InsuranceService";
import { getMyProDocs } from "../../service/ProService";
import { groupsWithSettings, recommendGroup, START_TEXT } from "./insuranceGroups";
import { C, Box, Txt, Btn, Hero, GroupPriceGrid, Fold, LimitRows, DeductRows, ScopeRows, Shield } from "./InsuranceBlocks";
import { FixedBar } from "./insuranceStyles";
import usePcWide from "../../hooks/usePcWide";

const InsurancePage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide();
  const { currentUser, userData } = useAuth();
  const uid = userData?.uid || currentUser?.uid;

  const [settings, setSettings] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [recId, setRecId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, p, pros] = await Promise.all([
        getInsuranceSettings(),
        uid ? getMyPolicies(uid).catch(() => []) : Promise.resolve([]),
        uid ? getMyProDocs(uid).catch(() => []) : Promise.resolve([]),
      ]);
      if (!alive) return;
      setSettings(s); setPolicies(p);
      const mine = pros.filter((x) => x.status === "approved");
      setRecId(mine.length ? recommendGroup(mine) : "");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [uid]);

  const groups = useMemo(() => groupsWithSettings(settings), [settings]);
  // 월 정기결제(그룹 · 예전 월 구독형)와 예전 1년 가입만 '내 보험'으로 본다 — 건당은 오더 한 건짜리
  const active = useMemo(() => pickActivePolicy(policies.filter((p) => p.type !== "perOrder")), [policies]);
  const minPrice = Math.min(...groups.map((g) => g.price));

  const sideBtn = { flex: "0 0 76px", width: 76, flexDirection: "column", gap: 0, fontSize: 13, height: 54 };
  const bar = (
    <div style={{ display: "flex", gap: 8 }}>
      <Btn ghost small style={sideBtn} onClick={() => navigate("/insurance/inquiry")}><IoChatbubbleEllipsesOutline size={20} />1:1 문의</Btn>
      <Btn ghost danger small style={sideBtn} onClick={() => navigate("/insurance/claim")}><IoAlertCircleOutline size={20} />사고접수</Btn>
      {active
        ? <Btn style={{ flex: 1 }} onClick={() => navigate("/insurance/my")}>내 보험 관리</Btn>
        : <Btn style={{ flex: 1 }} disabled={loading} onClick={() => navigate(uid ? "/insurance/join" : "/MobileLogin")}>카드 등록하고 1분 만에 가입</Btn>}
    </div>
  );

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {active ? (
        // 가입한 사람 — 맨 위에 보장 상태 한 줄
        <Box style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/insurance/my")}>
          <Shield size={52} label="" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.P }}>보장 중{active.group ? ` · ${active.group}그룹` : ""}</div>
            <Txt style={{ fontSize: 14 }}>{formatDate(active.endAt)}까지 보장{active.type === "monthly" && active.autoRenew !== false ? " · 매월 자동 갱신" : ""}</Txt>
          </div>
          <IoChevronForward size={20} color={C.SUB} />
        </Box>
      ) : <Hero minPrice={minPrice} />}

      <GroupPriceGrid groups={groups} recId={recId} />

      <Box style={{ paddingTop: 2, paddingBottom: 2 }}>
        <Fold title="보상 한도 (1사고당)" defaultOpen><LimitRows /></Fold>
        <Fold title="작업 중 사고, 보상 범위 3단계"><ScopeRows /></Fold>
        <Fold title="자기부담금 (1사고당)"><DeductRows /></Fold>
        <Fold title="보장 개시 조건 · 약관">
          <Txt>{START_TEXT}</Txt>
          <Txt style={{ fontSize: 14, marginTop: 8 }}>세부적인 보험약관 및 안내 문구는 변경될 수 있습니다.</Txt>
        </Fold>
      </Box>

      {/* 앱 밖에서 받은 일도 등재하면 보장 — 셀프보장등록 (형 리뷰 9/16) */}
      <Box style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/order/create?self=1")}>
        <IoDocumentTextOutline size={24} color={C.P} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.TXT }}>셀프보장등록</div>
          <Txt style={{ fontSize: 14 }}>외부 오더도 작업 시작 전에 앱에 등재하면 똑같이 보장됩니다.</Txt>
        </div>
        <IoChevronForward size={20} color={C.SUB} />
      </Box>
    </div>
  );

  if (pcWide) {
    return (
      <MainListLayout NAME="보험" footerType="insurance" hideBack hideActions>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 23, fontWeight: 700, color: C.TXT }}>
            <IoShieldCheckmarkOutline size={26} color={C.P} />홈프로 도급업자 배상책임보험
          </div>
          {body}
          {bar}
        </div>
      </MainListLayout>
    );
  }

  return (
    <MainListLayout NAME="보험" footerType="insurance" hideBack hideActions>
      <div style={{ padding: "16px 18px 150px", background: C.SOFT }}>{body}</div>
      <FixedBar $tab>{bar}</FixedBar>
    </MainListLayout>
  );
};

export default InsurancePage;
