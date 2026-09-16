/* eslint-disable */
// 기술전수 교육생 모집 — 상세 (조건 확인 → 전화하기 / 채팅하기, 수강생은 모두 무료)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCallOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";
import {
  TRAINING_COL, STATUS_COLOR, normalizeTraining, computeStatus, recruitText, eduDateText,
  priceInfo, formatTs, dotDate, callTrainer, chatTrainer,
} from "./trainingShared";

const TrainingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, TRAINING_COL, id), (snap) => {
      setData(snap.exists() ? normalizeTraining({ id: snap.id, ...snap.data() }) : null);
      setLoading(false);
    }, (err) => {
      console.error("교육 상세 로드 실패:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const NAME = "교육생 모집";

  if (loading) {
    return <SimpleBackLayout NAME={NAME} hideFooter><Center>불러오는 중...</Center></SimpleBackLayout>;
  }
  const mine = !!data && !!userData?.uid && data.authorUid === userData.uid;
  if (!data || (data.status === "pending" && !mine)) {
    return <SimpleBackLayout NAME={NAME} hideFooter><Center>존재하지 않거나 게시되지 않은 교육입니다</Center></SimpleBackLayout>;
  }

  const status = computeStatus(data);
  const price = priceInfo(data);
  const ended = status === "교육완료" || status === "모집마감";
  const manualClosed = data.status === "모집마감" || data.status === "마감";

  const toggleClose = async () => {
    const closing = !manualClosed;
    if (!window.confirm(closing ? "모집을 마감할까요?\n목록에 '모집마감'으로 표시됩니다." : "모집을 다시 열까요?")) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, TRAINING_COL, data.id), { status: closing ? "모집마감" : "모집중", updatedAt: serverTimestamp() });
    } catch {
      window.alert("처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    ["분야", [data.categoryLabel, data.subCategory].filter(Boolean).join(" · ")],
    ["교육 방식", data.method],
    ["모집 기간", status === "교육완료" ? "교육 종료" : recruitText(data)],
    ["교육 일시", [eduDateText(data), data.eduTime].filter(Boolean).join(" · ")],
    ["지역", data.regionLabel],
    ["장소 안내", data.address],
    ["모집 정원", data.capacity ? `${data.capacity}명${data.capacityNote ? ` (${data.capacityNote})` : ""}` : ""],
    ["강사 / 업체", data.instructor],
  ].filter(([, v]) => v);

  return (
    <SimpleBackLayout NAME={NAME} hideFooter>
      <PageWrap>
        {data.photos.length > 0 && (
          <Gallery>
            <MainPhoto><img src={data.photos[Math.min(photoIdx, data.photos.length - 1)]} alt="" /></MainPhoto>
            {data.photos.length > 1 && (
              <ThumbRow>
                {data.photos.map((u, i) => (
                  <ThumbBtn key={u} $active={i === photoIdx} onClick={() => setPhotoIdx(i)}><img src={u} alt="" /></ThumbBtn>
                ))}
              </ThumbRow>
            )}
          </Gallery>
        )}

        <Section>
          <HeadRow>
            <StatusText style={{ color: STATUS_COLOR[status] }}>{status}</StatusText>
            <RegDate>등록 {formatTs(data.publishedAt || data.createdAt)}</RegDate>
          </HeadRow>
          <Title>
            {data.tag && <TagText>[{data.tag}]</TagText>}
            {data.title}
          </Title>
          <PriceBox>
            <PriceMain>{price.main}</PriceMain>
            {price.regular && <PriceRegular>정가 {price.regular}</PriceRegular>}
          </PriceBox>
          {data.priceEarly != null && data.earlyUntil && <EarlyNote>얼리버드 할인 {dotDate(data.earlyUntil)}까지</EarlyNote>}

          <InfoTable>
            {rows.map(([k, v]) => (
              <InfoRow key={k}><span>{k}</span><b>{v}</b></InfoRow>
            ))}
          </InfoTable>
        </Section>

        <Section>
          <SecTitle>주요 교육 내용</SecTitle>
          <Body>{data.curriculum || "내용 없음"}</Body>
        </Section>

        {data.benefits && (
          <Section>
            <SecTitle>기타 지원</SecTitle>
            <Body>{data.benefits}</Body>
          </Section>
        )}

        {mine && (
          <Section>
            <SecTitle>내 공고 관리</SecTitle>
            {data.status === "pending" ? (
              <Note>포인트 차감이 끝나지 않아 게시되지 않은 공고입니다. 고객센터로 문의해 주세요.</Note>
            ) : status === "교육완료" ? (
              <Note>교육 일정이 지나 자동으로 '교육완료'로 표시됩니다.</Note>
            ) : (
              <>
                <Note>{manualClosed ? "모집을 마감한 공고입니다." : "정원이 찼거나 더 받지 않으면 모집을 마감해 주세요."}</Note>
                <ManageBtn disabled={busy} onClick={toggleClose}>{manualClosed ? "모집 다시 열기" : "모집 마감하기"}</ManageBtn>
              </>
            )}
          </Section>
        )}

        <Note style={{ padding: "4px 4px 0" }}>
          목록·상세 열람과 전화·채팅 문의는 무료입니다. 홈프로는 교육 정보 제공과 연결만 하며, 교육 품질·계약 조건·비용·교육 결과에 대한 책임은 교육 개설자에게 있습니다.
        </Note>
      </PageWrap>

      {!mine && (
        <BottomBar>
          {ended && <EndedNote>{status === "교육완료" ? "종료된 교육입니다. 다음 기수는 문의해 보세요." : "모집이 마감된 교육입니다."}</EndedNote>}
          <BtnRow>
            <CallBtn type="button" onClick={() => callTrainer(data)}>
              <IoCallOutline size={18} /> 전화하기
            </CallBtn>
            <ChatBtn type="button" onClick={() => chatTrainer(data, userData, navigate)}>
              <IoChatbubbleEllipsesOutline size={18} /> 채팅 문의
            </ChatBtn>
          </BtnRow>
        </BottomBar>
      )}
    </SimpleBackLayout>
  );
};

export default TrainingDetailPage;

/* ===== styles ===== */
const Center = styled.div` padding: 80px 20px; text-align: center; font-size: 16px; color: #2b2f36; `;
const PageWrap = styled.div` padding: 12px 12px 130px; background: ${THEME.background}; `;
const Gallery = styled.div` margin-bottom: 12px; `;
const MainPhoto = styled.div`
  width: 100%; aspect-ratio: 4 / 3; border-radius: 12px; overflow: hidden; background: #eef0f3;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const ThumbRow = styled.div` display: flex; gap: 6px; margin-top: 8px; overflow-x: auto; `;
const ThumbBtn = styled.button`
  flex: none; width: 60px; height: 60px; padding: 0; border-radius: 8px; overflow: hidden; cursor: pointer; background: #eef0f3;
  border: 2px solid ${({ $active }) => ($active ? THEME.text : "transparent")};
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const Section = styled.div`
  background: ${THEME.surface}; border: 1px solid #eceef2; border-radius: 12px; padding: 18px; margin-bottom: 12px;
`;
const HeadRow = styled.div` display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; `;
const StatusText = styled.span` font-size: 15px; font-weight: 700; `;
const RegDate = styled.span` font-size: 13px; color: ${THEME.muted}; `;
const Title = styled.h1` margin: 0 0 12px; font-size: 21px; font-weight: 700; line-height: 1.4; color: ${THEME.text}; word-break: keep-all; `;
const TagText = styled.span` color: ${THEME.primaryDark}; margin-right: 5px; `;
const PriceBox = styled.div` display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; `;
const PriceMain = styled.span` font-size: 20px; font-weight: 700; color: ${THEME.text}; `;
const PriceRegular = styled.span` font-size: 14px; color: ${THEME.muted}; text-decoration: line-through; `;
const EarlyNote = styled.div` margin-top: 4px; font-size: 14px; color: #b45309; font-weight: 600; `;
const InfoTable = styled.div` margin-top: 14px; border-top: 1px solid #eceef2; `;
const InfoRow = styled.div`
  display: flex; justify-content: space-between; gap: 14px; padding: 11px 0; border-bottom: 1px solid #eceef2; font-size: 15px;
  span { flex: none; color: #2b2f36; }
  b { font-weight: 600; color: ${THEME.text}; text-align: right; word-break: keep-all; line-height: 1.45; }
`;
const SecTitle = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; margin-bottom: 10px; `;
const Body = styled.div` font-size: 15px; line-height: 1.7; color: ${THEME.text}; white-space: pre-wrap; word-break: keep-all; `;
const Note = styled.div` font-size: 14px; line-height: 1.6; color: #2b2f36; word-break: keep-all; `;
const ManageBtn = styled.button`
  width: 100%; height: 48px; margin-top: 12px; border-radius: 10px; border: 1px solid #d5d9e0; background: #fff;
  color: ${THEME.text}; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer;
  &:disabled { opacity: 0.6; }
`;
const BottomBar = styled.div`
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 400px; box-sizing: border-box;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px)); background: ${THEME.surface};
  box-shadow: 0 -1px 4px rgba(0,0,0,0.06); z-index: 100;
`;
const EndedNote = styled.div` font-size: 14px; color: #2b2f36; text-align: center; margin-bottom: 8px; `;
const BtnRow = styled.div` display: flex; gap: 10px; `;
const CallBtn = styled.button`
  flex: 1; height: 50px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 10px;
  border: 1px solid #d5d9e0; background: #fff; color: ${THEME.text}; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer;
`;
const ChatBtn = styled.button`
  flex: 1; height: 50px; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 10px;
  border: none; background: ${THEME.primary}; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer;
`;
