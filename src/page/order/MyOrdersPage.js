/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoDocumentTextOutline } from "react-icons/io5";

/* ─── 상태 탭 ─── */
const STATUS_TABS = ["전체", "진행중", "배차완료", "작업완료", "취소"];
const STATUS_STYLE = {
  "진행중": { bg: "#DBEAFE", color: THEME.primary },
  "배차완료": { bg: "#FEF3C7", color: "#B45309" },
  "작업완료": { bg: "#D1FAE5", color: THEME.success },
  "취소": { bg: "#FEE2E2", color: THEME.danger },
};

/* ─── 나의 오더 목업 데이터 ─── */
const MY_ORDERS = [
  { id: "mo1", status: "진행중", categoryId: "professional_cleaning", subcategory: "입주청소(신축)", title: "32평 신축 아파트 입주청소", location: "서울 송파구", date: "02.15", price: "320,000원", customer: "김**", matchType: "우선" },
  { id: "mo2", status: "배차완료", categoryId: "aircon_install", subcategory: "신규설치", title: "에어컨 2대 신규설치", location: "서울 강동구", date: "02.14", price: "500,000원", customer: "이**", matchType: "다중" },
  { id: "mo3", status: "작업완료", categoryId: "plumbing", subcategory: "하수구 막힘", title: "싱크대 하수구 뚫기", location: "서울 마포구", date: "02.10", price: "80,000원", customer: "박**", matchType: "우선" },
  { id: "mo4", status: "작업완료", categoryId: "electrical", subcategory: "콘센트.스위치", title: "거실 콘센트 교체", location: "서울 성동구", date: "02.08", price: "120,000원", customer: "최**", matchType: "다중" },
  { id: "mo5", status: "취소", categoryId: "boiler", subcategory: "보일러 수리", title: "보일러 점검 및 수리", location: "서울 노원구", date: "02.05", price: "견적요청", customer: "강**", matchType: "다중" },
];

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("전체");

  const filtered = activeTab === "전체"
    ? MY_ORDERS
    : MY_ORDERS.filter((o) => o.status === activeTab);

  return (
    <SimpleBackLayout NAME="나의 오더" hideFooter>
      <PageWrap>
        {/* 상태 탭 */}
        <TabRow>
          {STATUS_TABS.map((tab) => (
            <TabItem key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </TabItem>
          ))}
        </TabRow>

        {/* 통계 */}
        <StatRow>
          <StatItem>
            <StatNum>{MY_ORDERS.filter((o) => o.status === "진행중").length}</StatNum>
            <StatLabel>진행중</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatNum>{MY_ORDERS.filter((o) => o.status === "배차완료").length}</StatNum>
            <StatLabel>배차완료</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatNum>{MY_ORDERS.filter((o) => o.status === "작업완료").length}</StatNum>
            <StatLabel>작업완료</StatLabel>
          </StatItem>
        </StatRow>

        {/* 오더 리스트 */}
        {filtered.length === 0 ? (
          <EmptyWrap>
            <IoDocumentTextOutline size={48} color={THEME.muted} />
            <EmptyText>해당 상태의 오더가 없습니다</EmptyText>
          </EmptyWrap>
        ) : (
          filtered.map((order) => {
            const cat = CATEGORIES.find((c) => c.id === order.categoryId);
            const st = STATUS_STYLE[order.status] || STATUS_STYLE["진행중"];
            return (
              <OrderCard key={order.id}>
                <CardTop>
                  <StatusBadge $bg={st.bg} $color={st.color}>{order.status}</StatusBadge>
                  <OrderDate>{order.date}</OrderDate>
                </CardTop>
                <CardTitle>{order.title}</CardTitle>
                <TagRow>
                  <Tag>{cat?.icon} {cat?.shortName}</Tag>
                  <Tag>{order.subcategory}</Tag>
                  <MatchTag>[{order.matchType}]</MatchTag>
                </TagRow>
                <CardBottom>
                  <BottomLeft>
                    <BottomText>📍 {order.location}</BottomText>
                    <BottomText>👤 {order.customer}</BottomText>
                  </BottomLeft>
                  <PriceText>{order.price}</PriceText>
                </CardBottom>
              </OrderCard>
            );
          })
        )}
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default MyOrdersPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.background};
`;

const TabRow = styled.div`
  display: flex;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  padding: 0 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
`;

const TabItem = styled.div`
  padding: 14px 14px;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? "700" : "500")};
  color: ${({ $active }) => ($active ? THEME.text : THEME.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:active { opacity: 0.6; }
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  background: ${THEME.surface};
  padding: 16px 20px;
  margin-bottom: 8px;
`;

const StatItem = styled.div`
  flex: 1;
  text-align: center;
`;

const StatNum = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${THEME.primary};
`;

const StatLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const StatDivider = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const OrderCard = styled.div`
  background: ${THEME.surface};
  padding: 16px;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const OrderDate = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.muted};
`;

const CardTitle = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  margin-bottom: 8px;
`;

const TagRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
`;

const Tag = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const MatchTag = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${THEME.purple};
`;

const CardBottom = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid ${THEME.border};
`;

const BottomLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BottomText = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.muted};
`;

const PriceText = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${THEME.primary};
`;

const EmptyWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 12px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.muted};
`;
