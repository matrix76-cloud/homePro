/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoStorefrontOutline, IoCallOutline, IoTimeOutline, IoCarOutline, IoLocationOutline } from "react-icons/io5";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";

const SuppliesPage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { user } = useContext(UserContext);
  const regionName = user?.USERINFO?.address_name || "지역 미설정";
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "homepro_supplies"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSupplies(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <MainListLayout NAME="자재.장비" footerType="supplies" hideBack location={regionName}>
      <Content>
        {loading ? (
          <EmptyState>불러오는 중...</EmptyState>
        ) : supplies.length === 0 ? (
          <EmptyState>
            <EmptyText>등록된 업체가 없습니다</EmptyText>
            <EmptySub>우리 지역 자재.장비 업체를 등록해보세요</EmptySub>
          </EmptyState>
        ) : (
          supplies.map((item) => (
            <Card key={item.id} onClick={() => navigate(`/supplies/${item.id}`)}>
              <HeaderZone>
                <Avatar>
                  <IoStorefrontOutline size={20} color={THEME.textSecondary} />
                </Avatar>
                <HeaderText>
                  <ShopName>{item.name}</ShopName>
                  <LocationMeta>
                    <IoLocationOutline size={13} color={THEME.muted} />
                    {item.location || "지역 미등록"}
                  </LocationMeta>
                </HeaderText>
                {item.deliveryAvailable && (
                  <DeliveryTag>
                    <IoCarOutline size={13} />
                    배송가능
                  </DeliveryTag>
                )}
              </HeaderZone>
              <Body>
                {item.description && (
                  <Description>{item.description}</Description>
                )}
                <InfoRow>
                  <InfoItem>
                    <IoCallOutline size={14} color={THEME.muted} />
                    <InfoText>{item.phone || "연락처 없음"}</InfoText>
                  </InfoItem>
                  <InfoItem>
                    <IoTimeOutline size={14} color={THEME.muted} />
                    <InfoText>{item.hours || "시간 미등록"}</InfoText>
                  </InfoItem>
                </InfoRow>
              </Body>
            </Card>
          ))
        )}
      </Content>

      <FloatBtn onClick={() => navigate("/supplies/create")}>+ 업체 등록</FloatBtn>
    </MainListLayout>
  );
};

export default SuppliesPage;

// ─── Styled Components ───

const Content = styled.div`
  padding: 12px 12px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Card = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04),
    0 6px 20px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  &:active {
    transform: scale(0.985);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
`;

/* 상단 옅은 헤더 존 — 명도차로 위계 부여 */
const HeaderZone = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: #fafbfc;
  border-bottom: 1px solid ${THEME.border};
`;

const Avatar = styled.div`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f2f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const ShopName = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LocationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  color: ${THEME.muted};
`;

/* 배송가능 — 뱃지(연배경+진글씨) 대신 단색 배경 + 흰 글씨 태그 */
const DeliveryTag = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
  background: ${THEME.primary};
  padding: 4px 9px;
  border-radius: 6px;
`;

const Body = styled.div`
  padding: 16px 18px 18px;
`;

const Description = styled.div`
  font-size: 14px;
  color: ${THEME.textSecondary};
  margin-bottom: 14px;
  line-height: 1.55;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 18px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
`;

const InfoText = styled.span`
  font-size: 13px;
  color: ${THEME.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 10px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const EmptySub = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
`;

const FloatBtn = styled.button`
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  right: calc(50% - 163px);
  padding: 10px 18px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 90;
  &:active { opacity: 0.85; }
`;
