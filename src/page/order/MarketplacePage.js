/* eslint-disable */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../api/config";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";

const TRADE_TYPES_FILTER = ["전체", "시공도급", "작업도급", "사업권양도", "물품매매", "장비매매", "업체인수양도", "설치도급", "공사도급"];

const MarketplacePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("전체");

  // 유료구독 게이트 (placeholder — 추후 실제 체크)
  const isSubscriber = userData?.subscription?.active === true || true;

  useEffect(() => {
    const q = query(collection(db, "homepro_marketplace"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = filter === "전체" ? items : items.filter((i) => i.tradeType === filter);

  return (
    <SimpleBackLayout NAME="도급·양도·매매" hideFooter>
      <Wrap>
        {!isSubscriber && (
          <GateNotice>유료구독 회원만 게시글 작성 및 열람이 가능합니다</GateNotice>
        )}

        <FilterRow>
          {TRADE_TYPES_FILTER.map((t) => (
            <FilterChip key={t} $active={filter === t} onClick={() => setFilter(t)}>{t}</FilterChip>
          ))}
        </FilterRow>

        {loading ? (
          <Empty>불러오는 중...</Empty>
        ) : filtered.length === 0 ? (
          <Empty>등록된 게시글이 없습니다</Empty>
        ) : (
          <List>
            {filtered.map((it) => (
              <Card key={it.id}>
                <CardTop>
                  <TypeBadge>{it.tradeType}</TypeBadge>
                  <CardDate>{it.createdAt?.toDate ? new Date(it.createdAt.toDate()).toLocaleDateString() : ""}</CardDate>
                </CardTop>
                <CardTitle>{it.title}</CardTitle>
                <CardMeta>
                  <MetaItem>{it.region || "지역미정"}</MetaItem>
                  {it.contractType && <MetaItem>{it.contractType}</MetaItem>}
                  {it.amount > 0 && <MetaAmount>{Number(it.amount).toLocaleString()}원</MetaAmount>}
                </CardMeta>
                <CardDesc>{it.description?.slice(0, 80)}{it.description?.length > 80 ? "..." : ""}</CardDesc>
              </Card>
            ))}
          </List>
        )}

        <Fab onClick={() => navigate("/marketplace/create")}>+ 등록</Fab>
      </Wrap>
    </SimpleBackLayout>
  );
};

export default MarketplacePage;

const Wrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding-bottom: 80px;
`;

const GateNotice = styled.div`
  margin: 8px 12px;
  padding: 10px 14px;
  background: #FEF3C7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400E;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
`;

const FilterChip = styled.button`
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  border-radius: 16px;
  background: ${({ $active }) => ($active ? THEME.primary : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
  white-space: nowrap;
`;

const List = styled.div`
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const TypeBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: ${THEME.primary};
  padding: 3px 10px;
  border-radius: 12px;
`;

const CardDate = styled.span`
  font-size: 11px;
  color: ${THEME.muted};
`;

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 6px;
`;

const CardMeta = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  font-size: 11px;
  color: ${THEME.muted};
  background: #F3F4F6;
  padding: 2px 8px;
  border-radius: 8px;
`;

const MetaAmount = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-left: auto;
`;

const CardDesc = styled.div`
  font-size: 12px;
  color: ${THEME.muted};
  line-height: 1.5;
`;

const Empty = styled.div`
  text-align: center;
  padding: 80px 20px;
  font-size: 14px;
  color: ${THEME.muted};
`;

const Fab = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 22px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: ${THEME.primary};
  border: none;
  border-radius: 30px;
  box-shadow: 0 4px 12px rgba(124, 92, 252, 0.4);
  cursor: pointer;
  z-index: 100;
`;
