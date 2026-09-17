/* eslint-disable */
// 자재·장비 거래장터 — 현업 사업자 B2B 직거래 (대표 스펙 9/15)
// 거래 종류(전체/판매/구매요청/무료나눔) 탭 + 카테고리·지역 필터 + 최신순 카드 + 등록 버튼
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoImageOutline, IoStorefrontOutline, IoAdd } from "react-icons/io5";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import {
  SUPPLIES_COL, TRADE_TYPES, CATEGORIES, isLegacy, categoryShort, conditionLabel,
  formatPrice, dealMethodText, timeAgo, LINE, ACTIVE_FACE, INK_BUTTON,
} from "./suppliesConstants";

const TYPE_TABS = [{ key: "all", label: "전체" }, ...TRADE_TYPES];

const SuppliesPage = ({ embedded } = {}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeTab, setTypeTab] = useState("all");
  const [category, setCategory] = useState("all");
  const [regionQ, setRegionQ] = useState("");

  useEffect(() => {
    const q = query(collection(db, SUPPLIES_COL), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("자재·장비 목록 로드 실패:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const rq = regionQ.trim();
    return items.filter((it) => {
      const legacy = isLegacy(it);
      if (typeTab !== "all" && (legacy || it.tradeType !== typeTab)) return false;
      if (category !== "all" && (legacy || it.category !== category)) return false;
      if (rq) {
        const loc = `${it.location || ""} ${it.directPlace || ""}`;
        if (!loc.includes(rq)) return false;
      }
      return true;
    });
  }, [items, typeTab, category, regionQ]);

  const Wrapper = embedded ? React.Fragment : MainListLayout;
  const wrapperProps = embedded ? {} : { NAME: "자재.장비", footerType: "supplies", hideBack: true };

  return (
    <Wrapper {...wrapperProps}>
      <Content>
        <Intro>남은 시공 자재 처분·나눔부터 중고 장비·공구, 특장 차량까지 사장님끼리 직거래하는 장터입니다.</Intro>

        <TabBar>
          {TYPE_TABS.map((t) => (
            <TabCell key={t.key} type="button" $active={typeTab === t.key} onClick={() => setTypeTab(t.key)}>
              {t.label}
            </TabCell>
          ))}
        </TabBar>

        <FilterRow>
          <FilterSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">카테고리 전체</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </FilterSelect>
          <FilterInput
            placeholder="지역 검색 (예: 강남구)"
            value={regionQ}
            onChange={(e) => setRegionQ(e.target.value)}
          />
        </FilterRow>

        <ListArea>
          {loading ? (
            <Empty>불러오는 중...</Empty>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyTitle>조건에 맞는 글이 없습니다</EmptyTitle>
              <EmptySub>남은 자재나 안 쓰는 장비를 먼저 올려보세요</EmptySub>
            </Empty>
          ) : (
            filtered.map((it) =>
              isLegacy(it) ? (
                <Card key={it.id} onClick={() => navigate(`/supplies/${it.id}`)}>
                  <Thumb>
                    <IoStorefrontOutline size={28} color={THEME.muted} />
                  </Thumb>
                  <CardBody>
                    <Title>
                      <CatText>[업체]</CatText> {it.name || "이름 없는 업체"}
                    </Title>
                    {it.description && <Meta>{it.description}</Meta>}
                    <Foot>
                      {it.location || "지역 미등록"}
                      {it.phone ? ` · ${it.phone}` : ""}
                    </Foot>
                  </CardBody>
                </Card>
              ) : (
                <Card key={it.id} $done={it.status === "done"} onClick={() => navigate(`/supplies/${it.id}`)}>
                  <Thumb>
                    {Array.isArray(it.images) && it.images[0] ? (
                      <img src={it.images[0]} alt="" loading="lazy" />
                    ) : (
                      <IoImageOutline size={28} color={THEME.muted} />
                    )}
                    {it.status === "done" && <DoneCover>거래완료</DoneCover>}
                  </Thumb>
                  <CardBody>
                    <Title>
                      <CatText>[{categoryShort(it.category) || "기타"}]</CatText> {it.title}
                    </Title>
                    <Meta>
                      <TypeText $type={it.tradeType}>{TRADE_TYPES.find((t) => t.key === it.tradeType)?.label}</TypeText>
                      {it.condition ? ` · ${conditionLabel(it.condition)}` : ""}
                    </Meta>
                    <PriceRow>
                      <Price $free={it.tradeType === "free"}>{formatPrice(it)}</Price>
                      {it.tradeType !== "free" && (
                        <Nego>{it.negotiable ? "네고 가능" : "제안 불가"}</Nego>
                      )}
                    </PriceRow>
                    <Foot>
                      {[dealMethodText(it), it.location, timeAgo(it.createdAt)].filter(Boolean).join(" · ")}
                    </Foot>
                  </CardBody>
                </Card>
              )
            )
          )}
        </ListArea>
      </Content>

      <Fab type="button" onClick={() => navigate("/supplies/create")}>
        <IoAdd size={20} /> 글 등록
      </Fab>
    </Wrapper>
  );
};

export default SuppliesPage;

// ─── Styled ───

const Content = styled.div`
  padding: 12px 16px 100px;
  background: ${THEME.background};
`;

const Intro = styled.div`
  font-size: 15px;
  line-height: 1.5;
  color: ${THEME.text};
  margin: 2px 0 12px;
  word-break: keep-all;
`;

/* 탭바 기준 스타일 — 하나의 박스 + 사이 세로선, 열린 탭은 연회색 면 + 굵게 */
const TabBar = styled.div`
  display: flex;
  border: 1px solid ${LINE};
  background: #fff;
  margin-bottom: 10px;
`;

const TabCell = styled.button`
  flex: 1;
  height: 44px;
  border: none;
  border-left: 1px solid ${LINE};
  &:first-child { border-left: none; }
  background: ${({ $active }) => ($active ? ACTIVE_FACE : "#fff")};
  color: ${THEME.text};
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  padding: 0 4px;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const FilterSelect = styled.select`
  flex: 0 0 44%;
  min-width: 0;
  height: 44px;
  border: 1px solid ${LINE};
  border-radius: 0;
  padding: 0 10px;
  font-size: 15px;
  font-family: inherit;
  color: ${THEME.text};
  background: #fff;
`;

const FilterInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 1px solid ${LINE};
  border-radius: 0;
  padding: 0 12px;
  font-size: 15px;
  font-family: inherit;
  color: ${THEME.text};
  background: #fff;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${THEME.text}; }
  &::placeholder { color: ${THEME.muted}; }
`;

/* 필터 전환 시 화면이 줄었다 늘었다 하지 않게 최소 높이 */
const ListArea = styled.div`
  min-height: 55vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Card = styled.div`
  display: flex;
  gap: 14px;
  padding: 14px;
  background: #fff;
  border: 1px solid ${LINE};
  cursor: pointer;
  opacity: ${({ $done }) => ($done ? 0.72 : 1)};
  &:active { background: #fafbfc; }
`;

const Thumb = styled.div`
  position: relative;
  flex: 0 0 92px;
  width: 92px;
  height: 92px;
  background: #f1f3f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const DoneCover = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(20, 24, 31, 0.55);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: keep-all;
`;

const CatText = styled.span`
  color: ${THEME.textSecondary};
  font-weight: 600;
`;

const Meta = styled.div`
  font-size: 14px;
  color: ${THEME.textSecondary};
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TypeText = styled.span`
  font-weight: 700;
  color: ${({ $type }) => ($type === "free" ? THEME.primaryDark : $type === "buy" ? "#b45309" : THEME.text)};
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
`;

const Price = styled.span`
  font-size: 17px;
  font-weight: 700;
  color: ${({ $free }) => ($free ? THEME.primaryDark : THEME.text)};
`;

const Nego = styled.span`
  font-size: 14px;
  color: ${THEME.textSecondary};
`;

const Foot = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Empty = styled.div`
  padding: 70px 20px;
  text-align: center;
  font-size: 15px;
  color: ${THEME.text};
`;

const EmptyTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 6px;
`;

const EmptySub = styled.div`
  font-size: 15px;
  color: ${THEME.textSecondary};
`;

const Fab = styled.button`
  position: fixed;
  bottom: calc(78px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 48px;
  padding: 0 22px;
  border: none;
  border-radius: 4px;
  background: ${THEME.button}; // 다른 교육.장터 탭의 등록 버튼과 같은 색
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  &:active { opacity: 0.88; }
`;
