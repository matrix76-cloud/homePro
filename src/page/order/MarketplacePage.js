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
import { pcOnly, PC } from "../../pc/pcKit";

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
        {/* 폰: 영향 없는 틀(display: contents) / PC: 분류 탭 + 지역·상태를 한 줄 필터 상자로 */}
        <FilterLine>
        <TabSlot>
        <TabBox>
          <TabItem $active={cat === "all"} onClick={() => setCat("all")}>전체</TabItem>
          {CATEGORIES.map((c) => (
            <TabItem key={c.key} $active={cat === c.key} onClick={() => setCat(c.key)}>{c.chipLabel}</TabItem>
          ))}
        </TabBox>
        </TabSlot>

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
        </FilterLine>

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
  ${pcOnly`padding: 18px 32px 80px; box-sizing: border-box; word-break: keep-all;`}
`;

const FilterLine = styled.div`
  display: contents;
  ${pcOnly`
    display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px;
    background: #fff; border: 1px solid ${PC.line}; padding: 16px 20px;
  `}
`;
const TabSlot = styled.div`
  display: contents;
  ${pcOnly`display: block; flex: 0 0 560px; button { font-size: 15px; }`}
`;

const CatDesc = styled.div`
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.55;
  color: ${THEME.textSecondary};
  word-break: keep-all;
  ${pcOnly`order: 3; flex: 1 0 100%; margin-top: 0; font-size: 15px; color: ${PC.body};`}
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
  ${pcOnly`margin: 0 0 0 auto; flex: 0 0 340px; gap: 12px;`}
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
  ${pcOnly`height: 44px; border-color: ${PC.line}; border-radius: 8px;`}
`;

const ListArea = styled.div`
  margin-top: 12px;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* PC: 3칸 카드 그리드 */
  ${pcOnly`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-content: start; margin-top: 18px; min-height: 420px;`}
`;

const Card = styled.div`
  background: #fff;
  border: 1px solid #e2e5ea;
  padding: 16px;
  cursor: pointer;
  opacity: ${({ $done }) => ($done ? 0.75 : 1)};
  &:active { background: #fafbfc; }
  ${pcOnly`
    border-color: ${PC.line}; padding: 20px 20px 18px; display: flex; flex-direction: column; min-width: 0;
    &:hover { border-color: ${PC.ink}; }
    & > *:nth-last-child(2) { margin-bottom: auto; } /* 카드 높이가 달라도 버튼은 바닥에 */
  `}
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
  ${pcOnly`overflow: visible; white-space: normal; font-size: 14px; color: ${PC.body};`}
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
  /* PC: 카드 높이가 달라도 버튼은 카드 바닥에 맞춘다 */
  ${pcOnly`margin-top: 16px; border-radius: 8px; &:hover { border-color: ${PC.ink}; }`}
`;

const Empty = styled.div`
  text-align: center;
  padding: 80px 20px;
  font-size: 16px;
  color: ${THEME.muted};
  ${pcOnly`grid-column: 1 / -1; background: #fff; border: 1px solid ${PC.line}; padding: 120px 20px; font-size: 17px; font-weight: 700; color: ${PC.ink};`}
`;

const Notice = styled.div`
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: ${THEME.muted};
  word-break: keep-all;
  ${pcOnly`color: ${PC.body};`}
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
  /* PC: 떠 있는 버튼 대신 제목 줄(위 52px 줄) 오른쪽 버튼 */
  ${pcOnly`top: 6px; bottom: auto; left: auto; right: 24px; transform: none; z-index: 1000; height: 40px; padding: 0 18px; border-radius: 10px; box-shadow: none; background: ${PC.primary};`}
`;
