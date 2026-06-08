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
import { IoCalendarOutline, IoPeopleOutline, IoLocationOutline, IoTimeOutline, IoCallOutline, IoPersonOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";

// 연락처가 전화번호 형태인지 (숫자 8자리 이상)
const isPhone = (c) => !!c && (c.replace(/[^0-9]/g, "").length >= 8);

const formatDate = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const formatPeriod = (s, e) => {
  if (!s && !e) return "일정 미정";
  if (s && e) return `${s} ~ ${e}`;
  return s || e;
};

const formatPrice = (priceType, price) => {
  if (priceType === "무료") return "무료";
  if (priceType === "협의") return "협의";
  if (price) return `${Number(price).toLocaleString()}원`;
  return "가격 미정";
};

const TrainingDetailPage = () => {
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
        const snap = await getDoc(doc(db, "homepro_trainings", id));
        if (snap.exists()) setData({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error("교육 상세 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChat = async () => {
    const myUid = userData?.uid;
    if (!myUid) return showToast("로그인이 필요합니다");
    if (!data?.createdBy) return showToast("등록자 정보가 없어 채팅할 수 없습니다");
    if (data.createdBy === myUid) return showToast("본인이 등록한 교육입니다");
    try {
      const roomId = await createChatRoom(
        myUid,
        userData?.nickname || userData?.name || "",
        userData?.profileImage || userData?.photoURL || "",
        data.createdBy,
        data.instructor || data.title || "강사",
        "",
        { trainingId: data.id, trainingTitle: data.title || "" }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error("채팅 시작 실패:", e);
      showToast("채팅 시작에 실패했습니다");
    }
  };

  if (loading) {
    return (
      <SimpleBackLayout NAME="기술전수교육" hideFooter>
        <Center>불러오는 중...</Center>
      </SimpleBackLayout>
    );
  }

  if (!data) {
    return (
      <SimpleBackLayout NAME="기술전수교육" hideFooter>
        <Center>존재하지 않는 교육입니다</Center>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="기술전수교육" hideFooter>
      <ToastWrap $show={!!toast}>{toast}</ToastWrap>
      <PageWrap>
        <Section>
          <TopRow>
            <StatusBadge $status={data.status}>{data.status || "모집중"}</StatusBadge>
            {data.field && <FieldBadge>{data.field}</FieldBadge>}
          </TopRow>
          <Title>{data.title}</Title>
          <Instructor>
            <IoPersonOutline size={14} color={THEME.muted} />
            {data.instructor || "강사 미정"}
          </Instructor>

          <InfoList>
            <InfoLine>
              <IoCalendarOutline size={16} color={THEME.muted} />
              <span>{formatPeriod(data.startDate, data.endDate)}</span>
            </InfoLine>
            {data.startTime && (
              <InfoLine>
                <IoTimeOutline size={16} color={THEME.muted} />
                <span>{data.startTime}</span>
              </InfoLine>
            )}
            <InfoLine>
              <IoPeopleOutline size={16} color={THEME.muted} />
              <span>{data.capacity ? `${data.capacity}명 모집` : "인원 미정"}</span>
            </InfoLine>
            <InfoLine>
              <IoLocationOutline size={16} color={THEME.muted} />
              <span>{data.location || "지역 미정"}</span>
            </InfoLine>
          </InfoList>
        </Section>

        {Array.isArray(data.methods) && data.methods.length > 0 && (
          <Section>
            <SectionTitle>교육 방식</SectionTitle>
            <ChipRow>
              {data.methods.map((m) => (
                <Chip key={m}>{m}</Chip>
              ))}
            </ChipRow>
          </Section>
        )}

        <Section>
          <SectionTitle>교육 내용</SectionTitle>
          <Body>{data.description || "내용 없음"}</Body>
        </Section>

        <Section>
          <SectionTitle>비용</SectionTitle>
          <Price>{formatPrice(data.priceType, data.price)}</Price>
        </Section>

        {data.contact && (
          <Section>
            <SectionTitle>연락처</SectionTitle>
            <InfoLine>
              <IoCallOutline size={16} color={THEME.muted} />
              <span>{data.contact}</span>
            </InfoLine>
          </Section>
        )}

        <RegDate>등록일 {formatDate(data.createdAt)}</RegDate>
      </PageWrap>

      <BottomBar>
        {isPhone(data.contact) ? (
          <CallBtn as="a" href={`tel:${data.contact.replace(/[^0-9+]/g, "")}`}>
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

export default TrainingDetailPage;

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
  gap: 8px;
  margin-bottom: 12px;
`;

const StatusBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: ${(p) => (p.$status === "마감" ? "#FEE2E2" : "#ECFDF5")};
  color: ${(p) => (p.$status === "마감" ? THEME.danger : THEME.success)};
`;

const FieldBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.primary};
  background: ${THEME.purpleLight};
  padding: 4px 10px;
  border-radius: 20px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0 0 8px;
  line-height: 1.4;
`;

const Instructor = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: ${THEME.textSecondary};
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

const Price = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.primary};
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
