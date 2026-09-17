/* eslint-disable */
// 양도·매매 리스트 (인수자 뷰) — 3대 카테고리 · 지역 · 상태 필터
// 민감 정보(월 평균 매출·거래처·상세 설명)는 리스트에 노출하지 않고 상세 + 1:1 채팅으로 유도
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../api/config";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { isSubscriber } from "../../utility/tierUtils";
import { KR_AREAS } from "../../utility/constants";
import {
  MARKET_COLLECTION, CATEGORIES, STATUSES, getCategory, getCategoryKey, getStatus,
  premiumText, rentText, includesSummary, regionText, timeAgo, TabBox, TabItem,
} from "./MarketplaceShared";

const MarketplacePage = ({ embedded } = {}) => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const canWrite = isSubscriber(userData);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [sido, setSido] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const q = query(collection(db, MARKET_COLLECTION), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (cat !== "all" && getCategoryKey(it) !== cat) return false;
        if (sido && !regionText(it).startsWith(sido)) return false;
        if (status && getStatus(it).key !== status) return false;
        return true;
      }),
    [items, cat, sido, status]
  );

  const handleWrite = () => {
    if (!canWrite) {
      if (window.confirm("양도·매매 글 등록은 월 구독 사업자만 할 수 있습니다.\n구독 안내로 이동할까요?")) navigate("/subscription");
      return;
    }
    navigate("/marketplace/create");
  };

  const Wrapper = embedded ? React.Fragment : SimpleBackLayout;
  const wrapperProps = embedded ? {} : { NAME: "양도·매매", hideFooter: true };

  return (
    <Wrapper {...wrapperProps}>
      <Wrap>
        <TabBox>
          <TabItem $active={cat === "all"} onClick={() => setCat("all")}>전체</TabItem>
          {CATEGORIES.map((c) => (
            <TabItem key={c.key} $active={cat === c.key} onClick={() => setCat(c.key)}>{c.chipLabel}</TabItem>
          ))}
        </TabBox>

        {cat !== "all" && <CatDesc>{CATEGORIES.find((c) => c.key === cat)?.desc}</CatDesc>}

        <FilterRow>
          <Select value={sido} onChange={(e) => setSido(e.target.value)}>
            <option value="">지역 전체</option>
            {KR_AREAS.map((a) => <option key={a.sido} value={a.sido}>{a.sido}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">상태 전체</option>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </FilterRow>

        <ListArea>
          {loading ? (
            <Empty>불러오는 중...</Empty>
          ) : filtered.length === 0 ? (
            <Empty>조건에 맞는 매물이 없습니다</Empty>
          ) : (
            filtered.map((it) => {
              const c = getCategory(it);
              const st = getStatus(it);
              const rent = rentText(it);
              const summary = includesSummary(it);
              const go = () => navigate(`/marketplace/${it.id}`);
              return (
                <Card key={it.id} onClick={go} $done={st.key === "done"}>
                  <TopLine>
                    <StatusText style={{ color: st.color }}>{st.label}</StatusText>
                    <MetaText>{regionText(it)} · {timeAgo(it.createdAt)}</MetaText>
                  </TopLine>
                  <Title>
                    <TagText>[{c.tag}]</TagText> {it.title}
                  </Title>
                  <PriceLine>
                    <Price>{premiumText(it)}</Price>
                    {rent && <Rent>{rent}</Rent>}
                  </PriceLine>
                  {summary.length > 0 && <Summary>{summary.join(" · ")}</Summary>}
                  <CtaBtn type="button" onClick={(e) => { e.stopPropagation(); go(); }}>
                    상세보기 및 비밀채팅 문의
                  </CtaBtn>
                </Card>
              );
            })
          )}
        </ListArea>

        <Notice>
          매출·거래처 등 민감한 정보는 상세 화면과 1:1 채팅에서만 확인할 수 있습니다.
          홈프로는 정보 등록·연결 서비스이며 거래 당사자가 아닙니다.
        </Notice>

        <Fab type="button" onClick={handleWrite}>+ 매물 등록</Fab>
      </Wrap>
    </Wrapper>
  );
};

export default MarketplacePage;

const Wrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding: 12px 16px 110px;
`;

const CatDesc = styled.div`
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.55;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const Select = styled.select`
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 10px;
  border: 1px solid #d5d9e0;
  border-radius: 0;
  background: #fff;
  color: ${THEME.text};
  font-size: 15px;
  font-family: inherit;
`;

const ListArea = styled.div`
  margin-top: 12px;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Card = styled.div`
  background: #fff;
  border: 1px solid #e2e5ea;
  padding: 16px;
  cursor: pointer;
  opacity: ${({ $done }) => ($done ? 0.75 : 1)};
  &:active { background: #fafbfc; }
`;

const TopLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const StatusText = styled.span`
  font-size: 14px;
  font-weight: 700;
  flex: none;
`;

const MetaText = styled.span`
  font-size: 13px;
  color: ${THEME.muted};
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Title = styled.div`
  margin-top: 8px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.45;
  color: ${THEME.text};
  word-break: break-word;
`;

const TagText = styled.span`
  color: ${THEME.textSecondary};
  font-weight: 700;
`;

const PriceLine = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
`;

const Price = styled.span`
  font-size: 19px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.3px;
`;

const Rent = styled.span`
  font-size: 15px;
  color: ${THEME.textSecondary};
`;

const Summary = styled.div`
  margin-top: 6px;
  font-size: 15px;
  color: ${THEME.primaryDark};
  font-weight: 600;
`;

const CtaBtn = styled.button`
  margin-top: 14px;
  width: 100%;
  height: 44px;
  border: 1px solid #cfd4dc;
  background: #fff;
  color: ${THEME.text};
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: #f3f4f6; }
`;

const Empty = styled.div`
  text-align: center;
  padding: 80px 20px;
  font-size: 16px;
  color: ${THEME.muted};
`;

const Notice = styled.div`
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: ${THEME.muted};
  word-break: keep-all;
`;

const Fab = styled.button`
  position: fixed;
  bottom: calc(78px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 8px;
  background: ${THEME.button};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  cursor: pointer;
`;
