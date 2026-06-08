/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { createChatRoom } from "../../service/ChatService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCallOutline, IoTimeOutline, IoLocationOutline, IoCarOutline, IoStorefrontOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";

const formatDate = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const SuppliesDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "homepro_supplies", id));
        if (snap.exists()) setData({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error("업체 상세 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChat = async () => {
    const myUid = userData?.uid;
    if (!myUid) return showToast("로그인이 필요합니다");
    if (!data?.createdBy) return showToast("등록자 정보가 없어 채팅할 수 없습니다");
    if (data.createdBy === myUid) return showToast("본인이 등록한 업체입니다");
    try {
      const roomId = await createChatRoom(
        myUid,
        userData?.nickname || userData?.name || "",
        userData?.profileImage || userData?.photoURL || "",
        data.createdBy,
        data.name || "업체",
        "",
        { supplyId: data.id, supplyTitle: data.name || "" }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error("채팅 시작 실패:", e);
      showToast("채팅 시작에 실패했습니다");
    }
  };

  if (loading) {
    return (
      <SimpleBackLayout NAME="자재.장비" hideFooter>
        <Center>불러오는 중...</Center>
      </SimpleBackLayout>
    );
  }

  if (!data) {
    return (
      <SimpleBackLayout NAME="자재.장비" hideFooter>
        <Center>존재하지 않는 업체입니다</Center>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="자재.장비" hideFooter>
      <ToastWrap $show={!!toast}>{toast}</ToastWrap>
      <PageWrap>
        <Section>
          <TopRow>
            <ShopIcon>
              <IoStorefrontOutline size={22} color={THEME.primary} />
            </ShopIcon>
            <ShopName>{data.name}</ShopName>
          </TopRow>
          {data.deliveryAvailable && (
            <DeliveryBadge>
              <IoCarOutline size={14} />
              배송가능
            </DeliveryBadge>
          )}

          <InfoList>
            <InfoLine>
              <IoCallOutline size={16} color={THEME.muted} />
              <span>{data.phone || "연락처 없음"}</span>
            </InfoLine>
            <InfoLine>
              <IoTimeOutline size={16} color={THEME.muted} />
              <span>{data.hours || "영업시간 미등록"}</span>
            </InfoLine>
            <InfoLine>
              <IoLocationOutline size={16} color={THEME.muted} />
              <span>{data.location || "지역 미등록"}</span>
            </InfoLine>
          </InfoList>
        </Section>

        {data.description && (
          <Section>
            <SectionTitle>업체 소개</SectionTitle>
            <Body>{data.description}</Body>
          </Section>
        )}

        {Array.isArray(data.items) && data.items.length > 0 && (
          <Section>
            <SectionTitle>취급 품목</SectionTitle>
            <ChipRow>
              {data.items.map((it, i) => (
                <Chip key={i}>{it}</Chip>
              ))}
            </ChipRow>
          </Section>
        )}

        <RegDate>등록일 {formatDate(data.createdAt)}</RegDate>
      </PageWrap>

      <BottomBar>
        {data.phone ? (
          <CallBtn as="a" href={`tel:${data.phone}`}>
            <IoCallOutline size={18} />
            전화 문의
          </CallBtn>
        ) : (
          <CallBtn type="button" onClick={() => showToast("등록된 전화번호가 없습니다")}>
            <IoCallOutline size={18} />
            전화 문의
          </CallBtn>
        )}
        <ChatBtn onClick={handleChat}>
          <IoChatbubbleEllipsesOutline size={18} />
          채팅 문의
        </ChatBtn>
      </BottomBar>
    </SimpleBackLayout>
  );
};

export default SuppliesDetailPage;

/* ===== styles ===== */
const PageWrap = styled.div`
  padding: 12px 12px 90px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Section = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const ShopIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${THEME.purpleLight};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ShopName = styled.h2`
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0;
  line-height: 1.3;
`;

const DeliveryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.success};
  background: #ecfdf5;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 16px;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const InfoLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${THEME.text};
`;

const SectionTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0 0 12px;
`;

const Body = styled.p`
  font-size: 14px;
  color: ${THEME.textSecondary};
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Chip = styled.span`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 20px;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const RegDate = styled.div`
  font-size: 12px;
  color: ${THEME.muted};
  text-align: center;
  padding: 4px 0;
`;

const Center = styled.div`
  padding: 80px 0;
  text-align: center;
  font-size: 14px;
  color: ${THEME.muted};
`;

const BottomBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 12px;
  box-sizing: border-box;
  background: ${THEME.surface};
  box-shadow: 0 -1px 4px rgba(0,0,0,0.06);
  z-index: 100;
  display: flex;
  gap: 10px;
`;

const ChatBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 0;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const CallBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 0;
  border: 1.5px solid ${THEME.primary};
  border-radius: 10px;
  background: #fff;
  color: ${THEME.primary};
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const ToastWrap = styled.div`
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: ${THEME.text};
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  z-index: 9999;
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 0.25s;
  pointer-events: none;
`;
