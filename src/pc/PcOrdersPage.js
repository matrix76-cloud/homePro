/* eslint-disable */
/**
 * PC 오더목록 — 왼쪽 세로 메뉴 틀의 넓은 본문 (시안 랩 pcshell 3번, 형 9/20).
 * 거르기·정렬·행 클릭 규칙은 폰 오더목록(MobileMainpage ProMain)과 같다 — 도우미 함수를 그대로 가져다 쓴다.
 * 폰 화면과 다른 점: 필터를 바텀시트 대신 한 줄 선택 상자로, 표에 단가유형·접수시각 칸까지 한 번에.
 */
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { FiPlus } from "react-icons/fi";
import { UserContext } from "../context/User";
import { useAuth } from "../context/AuthContext";
import { CATEGORIES } from "../config/homeproConfig";
import { subscribeToAllOrders, formatOrderTime } from "../service/OrderService";
import {
  STATUS_COLOR, SORT_OPTIONS, getDistanceCategory, formatRegionLabel, formatPriceType, formatMatchType, formatOrderScheduleShort,
} from "../page/main/MobileMainpage";

const STATUS_OPTIONS = ["전체", "접수", "대기", "마감", "취소"];
const DISTANCE_OPTIONS = ["전체", "내 동네", "같은 시", "타지역"];
const PERIOD_OPTIONS = ["전체", "당일", "어제", "지난1주일", "지난2주일", "지난1개월"];
const DISTANCE_RANK = { "내 동네": 0, "같은 시": 1, "타지역": 2 };

// 상태 묶음 — 폰 오더목록과 같은 규칙
const mapStatus = (status) => {
  if (status === "요청" || status === "접수") return "접수";
  if (status === "대기") return "대기";
  if (status === "취소" || status === "거부") return "취소";
  if (["배정", "완료", "마감", "선정대기", "업체선택대기", "진행", "결제", "리뷰"].includes(status)) return "마감";
  return "접수";
};
const toDate = (o) => (o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0));

const PcOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const myRegion = userData?.region;

  const [rawOrders, setRawOrders] = useState(null);
  const [sort, setSort] = useState("등록순");
  const [status, setStatus] = useState("전체");
  const [dist, setDist] = useState("전체");
  const [period, setPeriod] = useState("전체");
  const [catId, setCatId] = useState("전체");
  const [hideClosed, setHideClosed] = useState(true);
  const [blockedUids, setBlockedUids] = useState(new Set());
  const [toast, setToast] = useState("");

  useEffect(() => {
    const unsub = subscribeToAllOrders((orders) => setRawOrders(orders));
    return () => unsub();
  }, []);

  // 내가 거부 등록한 상대의 오더는 열지 못한다
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const { getMyBlocks } = await import("../service/BlockService");
        const list = await getMyBlocks(uid);
        if (!cancelled) setBlockedUids(new Set(list.map((b) => b.blockedUid)));
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const orders = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const inPeriod = (o) => {
      if (period === "전체") return true;
      const d = toDate(o);
      const days = (now - d) / 86400000;
      if (period === "당일") return now.toDateString() === d.toDateString();
      if (period === "어제") return yesterday.toDateString() === d.toDateString();
      if (period === "지난1주일") return days >= 0 && days <= 7;
      if (period === "지난2주일") return days >= 0 && days <= 14;
      if (period === "지난1개월") return days >= 0 && days <= 30;
      return true;
    };
    const list = (rawOrders || [])
      .filter((o) => !(o.hiddenBy || []).includes(uid))
      .map((o) => {
        const cat = CATEGORIES.find((c) => c.id === o.categoryId);
        return { ...o, categoryName: cat?.shortName || o.categoryName || o.categoryId, _cat: cat, _status: mapStatus(o.orderStatus) };
      })
      .filter((o) => {
        const wantsClosed = status === "마감" || status === "취소";
        if (hideClosed && !wantsClosed && (o._status === "마감" || o._status === "취소")) return false;
        if (status !== "전체" && o._status !== status) return false;
        if (catId !== "전체" && o.categoryId !== catId) return false;
        if (!inPeriod(o)) return false;
        if (dist !== "전체" && getDistanceCategory(o.location, myRegion) !== dist) return false;
        return true;
      });
    const byDate = (a, b) => toDate(b) - toDate(a);
    if (sort === "가까운거리순") {
      const rank = (o) => { const c = getDistanceCategory(o.location, myRegion); return c ? DISTANCE_RANK[c] : 3; };
      return list.sort((a, b) => rank(a) - rank(b) || byDate(a, b));
    }
    if (sort === "서비스순") return list.sort((a, b) => (a.categoryName || "").localeCompare(b.categoryName || "", "ko"));
    if (sort === "지역순") return list.sort((a, b) => String(formatRegionLabel(a.location) || "").localeCompare(String(formatRegionLabel(b.location) || ""), "ko"));
    if (sort === "요청방식순") return list.sort((a, b) => (a.matchType || "").localeCompare(b.matchType || "", "ko"));
    if (sort === "단가유형순") return list.sort((a, b) => (a.priceType || a.b2bPriceType || "").localeCompare(b.priceType || b.b2bPriceType || "", "ko"));
    return list.sort(byDate);
  }, [rawOrders, uid, myRegion, sort, status, dist, period, catId, hideClosed]);

  const filtersOn = sort !== "등록순" || status !== "전체" || dist !== "전체" || period !== "전체" || catId !== "전체";
  const resetFilters = () => { setSort("등록순"); setStatus("전체"); setDist("전체"); setPeriod("전체"); setCatId("전체"); };

  const openOrder = (order) => {
    if (order._status === "마감") return showToast("이미 마감된 항목은 확인할 수 없습니다");
    if (order._status === "대기" && order.createdBy !== uid) return showToast("접수자가 수정 중인 오더입니다");
    if (order.createdBy !== uid && blockedUids.has(order.createdBy)) return showToast("거부등록된 오더입니다");
    navigate(`/order/detail/${order.id}`, { state: { order, category: order._cat } });
  };

  return (
    <Wrap>
      <TitleRow>
        <div>
          <Title>오더목록</Title>
          <Count>{rawOrders === null ? "불러오는 중" : `${orders.length}건`}</Count>
        </div>
        <CreateBtn onClick={() => navigate("/order/create")}><FiPlus />오더 접수</CreateBtn>
      </TitleRow>

      <FilterRow>
        <Field><label>정렬</label><select value={sort} onChange={(e) => setSort(e.target.value)}>{SORT_OPTIONS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field><label>상태</label><select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_OPTIONS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field><label>거리</label><select value={dist} onChange={(e) => setDist(e.target.value)}>{DISTANCE_OPTIONS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field><label>기간</label><select value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIOD_OPTIONS.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field $wide><label>카테고리</label>
          <select value={catId} onChange={(e) => setCatId(e.target.value)}>
            <option value="전체">전체</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.shortName || c.name}</option>)}
          </select>
        </Field>
        <Check><input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />마감·취소 숨기기</Check>
        {filtersOn && <Reset onClick={resetFilters}>필터 초기화</Reset>}
      </FilterRow>

      <Table>
        <Head>
          <span>작업일</span><span>상태</span><span>요청방식</span><span>서비스</span><span>지역</span><span>단가유형</span><span>접수일</span>
        </Head>
        {rawOrders !== null && orders.length === 0 && (
          <Empty>
            <b>조건에 맞는 오더가 없습니다</b>
            <span>{filtersOn || hideClosed ? "필터를 바꾸면 더 많은 오더가 보입니다." : "새 오더가 올라오면 이곳에 표시됩니다."}</span>
          </Empty>
        )}
        {orders.map((o) => {
          const color = STATUS_COLOR[o._status] || STATUS_COLOR["접수"];
          return (
            <Row key={o.id} onClick={() => openOrder(o)}>
              <span style={o.workDate === "긴급" ? { color: "#E5484D", fontWeight: 800 } : null}>{formatOrderScheduleShort(o)}</span>
              <span style={{ color, fontWeight: 700 }}>{o._status}</span>
              <span>{formatMatchType(o)}</span>
              <b>{o.subcategory || o.subcategories?.[0] || o.categoryName}</b>
              <span>{formatRegionLabel(o.location)}</span>
              <span>{formatPriceType(o)}</span>
              <span>{formatOrderTime ? formatOrderTime(o.createdAt) : ""}</span>
            </Row>
          );
        })}
      </Table>

      {toast && <Toast>{toast}</Toast>}
    </Wrap>
  );
};

export default PcOrdersPage;

const COLS = "110px 90px 100px minmax(200px, 1.6fr) minmax(140px, 1fr) minmax(120px, 0.9fr) 130px";

const Wrap = styled.div`
  max-width: 1320px; margin: 0 auto; padding: 30px 32px 80px; box-sizing: border-box; color: #14181F; word-break: keep-all;
`;
const TitleRow = styled.div` display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; & > div { display: flex; align-items: baseline; gap: 12px; } `;
const Title = styled.h1` font-size: 26px; font-weight: 800; margin: 0; `;
const Count = styled.span` font-size: 16px; color: #14181F; `;
const CreateBtn = styled.button`
  border: none; background: #00963F; color: #fff; border-radius: 10px; padding: 12px 20px; cursor: pointer;
  font-size: 16px; font-weight: 700; font-family: inherit; display: flex; align-items: center; gap: 6px;
  &:hover { background: #007A33; }
`;
const FilterRow = styled.div`
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 16px; margin-bottom: 18px;
  background: #fff; border: 1px solid #dfe3e8; padding: 16px 20px;
`;
const Field = styled.div`
  display: flex; flex-direction: column; gap: 6px; width: ${({ $wide }) => ($wide ? "200px" : "150px")};
  label { font-size: 14px; font-weight: 700; color: #14181F; }
  select {
    height: 42px; border: 1px solid #dfe3e8; border-radius: 8px; padding: 0 10px; background: #fff;
    font-size: 15px; font-family: inherit; color: #14181F; outline: none; cursor: pointer;
    &:focus { border-color: #00963F; }
  }
`;
const Check = styled.label`
  display: flex; align-items: center; gap: 8px; height: 42px; font-size: 15px; color: #14181F; cursor: pointer;
  input { width: 18px; height: 18px; accent-color: #00963F; }
`;
const Reset = styled.button`
  height: 42px; margin-left: auto; border: 1px solid #dfe3e8; background: #fff; border-radius: 8px; padding: 0 16px; cursor: pointer;
  font-size: 15px; font-weight: 600; font-family: inherit; color: #14181F; &:hover { border-color: #14181F; }
`;
const Table = styled.div` background: #fff; border: 1px solid #dfe3e8; min-height: 420px; `;
const Head = styled.div`
  display: grid; grid-template-columns: ${COLS}; gap: 12px; padding: 14px 24px; background: #e9ecf1;
  font-size: 15px; font-weight: 700; color: #14181F;
`;
const Row = styled.div`
  display: grid; grid-template-columns: ${COLS}; gap: 12px; padding: 16px 24px; border-top: 1px solid #dfe3e8;
  font-size: 16px; color: #14181F; cursor: pointer; align-items: center;
  b { font-weight: 700; }
  &:hover { background: #f4f6f8; }
`;
const Empty = styled.div`
  padding: 90px 20px; text-align: center; display: grid; gap: 8px; border-top: 1px solid #dfe3e8;
  b { font-size: 18px; } span { font-size: 15px; }
`;
const Toast = styled.div`
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%); z-index: 1300;
  background: #1b1f27; color: #fff; font-size: 15px; padding: 13px 22px; border-radius: 10px;
`;
