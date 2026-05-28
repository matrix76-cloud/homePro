/* eslint-disable */
/**
 * 작업자요청 상세 페이지 (시트6)
 * URL: /order/worker-request/detail/:requestId
 *
 * 동작:
 * - 작성자 본인: 응답자 목록 + 각 응답자와 채팅
 * - 타인: 응답하기 / 채팅 문의 (이미 응답했으면 응답 완료 표시)
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { createChatRoom } from "../../service/ChatService";

const WorkerRequestDetailPage = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { userData } = useAuth();
  const myUid = userData?.uid || "";

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responseMsg, setResponseMsg] = useState("");
  const [responding, setResponding] = useState(false);
  const [chatStarting, setChatStarting] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  useEffect(() => {
    if (!requestId) return;
    const unsub = onSnapshot(doc(db, "homepro_worker_requests", requestId), (snap) => {
      if (!snap.exists()) {
        setRequest(null);
      } else {
        setRequest({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [requestId]);

  if (loading) {
    return (
      <SimpleBackLayout NAME="작업자요청 상세" hideFooter>
        <CenterMsg>불러오는 중...</CenterMsg>
      </SimpleBackLayout>
    );
  }
  if (!request) {
    return (
      <SimpleBackLayout NAME="작업자요청 상세" hideFooter>
        <CenterMsg>요청을 찾을 수 없습니다.</CenterMsg>
      </SimpleBackLayout>
    );
  }

  const isOwner = myUid && request.createdBy === myUid;
  const applicants = Array.isArray(request.applicants) ? request.applicants : [];
  const alreadyApplied = applicants.some((a) => a.uid === myUid);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatWorkTime = (wt) => {
    if (!wt) return "";
    if (typeof wt === "string") return wt;
    if (wt.start && wt.end) return `${wt.start} ~ ${wt.end}`;
    return "";
  };

  const handleApply = async () => {
    if (!myUid) { showToast("로그인이 필요합니다"); return; }
    if (alreadyApplied) { showToast("이미 응답하셨습니다"); return; }
    if (responding) return;
    setResponding(true);
    try {
      await updateDoc(doc(db, "homepro_worker_requests", requestId), {
        applicants: arrayUnion({
          uid: myUid,
          name: userData?.nickname || userData?.name || "",
          photo: userData?.profileImage || userData?.photoURL || "",
          message: responseMsg.trim() || "",
          createdAt: new Date().toISOString(),
        }),
        applicantCount: (request.applicantCount || 0) + 1,
        lastApplicantAt: serverTimestamp(),
      });
      setResponseMsg("");
      showToast("응답이 등록되었습니다");
    } catch (e) {
      console.error(e);
      showToast("응답 실패: " + (e.message || ""));
    } finally {
      setResponding(false);
    }
  };

  const handleChat = async (otherUid, otherName, otherPhoto) => {
    if (!myUid) { showToast("로그인이 필요합니다"); return; }
    if (!otherUid || otherUid === myUid) return;
    if (chatStarting) return;
    setChatStarting(true);
    try {
      const myName = userData?.nickname || userData?.name || "";
      const myPhoto = userData?.profileImage || userData?.photoURL || "";
      const roomId = await createChatRoom(
        myUid, myName, myPhoto,
        otherUid, otherName || "", otherPhoto || "",
        { type: "worker_request" }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error(e);
      showToast("채팅 시작 실패");
    } finally {
      setChatStarting(false);
    }
  };

  return (
    <SimpleBackLayout NAME="작업자요청 상세" hideFooter>
      <PageWrap>
        <HeaderCard>
          <CategoryTag>{request.category || "작업"}</CategoryTag>
          <Title>{request.detail}</Title>
          <SubMeta>
            <span>등록: {request.writer || "익명"}</span>
            <Dot />
            <span>{formatDate(request.createdAt)}</span>
            {applicants.length > 0 && (
              <>
                <Dot />
                <ApplyCount>응답 {applicants.length}명</ApplyCount>
              </>
            )}
          </SubMeta>
        </HeaderCard>

        <Card>
          <Row>
            <Key>작업주소</Key>
            <Val>{request.siteAddr || "—"}</Val>
          </Row>
          {request.pickupAddr && (
            <Row>
              <Key>픽업주소</Key>
              <Val>{request.pickupAddr}</Val>
            </Row>
          )}
          {request.siteDetail && (
            <Row>
              <Key>현장 상세</Key>
              <Val>{request.siteDetail}</Val>
            </Row>
          )}
          <Row>
            <Key>작업날짜</Key>
            <Val>
              {request.workDate === "날짜지정" && request.workDatePicker
                ? `${request.workDate} (${request.workDatePicker})`
                : request.workDate || "—"}
            </Val>
          </Row>
          <Row>
            <Key>작업시간</Key>
            <Val>{formatWorkTime(request.workTime) || "—"}</Val>
          </Row>
          <Row>
            <Key>인원</Key>
            <Val>{request.headcount ? `${request.headcount}명` : "—"}</Val>
          </Row>
          <Row>
            <Key>인건비</Key>
            <Val>{request.wage ? `${Number(request.wage).toLocaleString()}원` : "협의"}</Val>
          </Row>
        </Card>

        {isOwner ? (
          <>
            <SectionTitle>받은 응답 ({applicants.length})</SectionTitle>
            {applicants.length === 0 ? (
              <EmptyCard>아직 응답이 없습니다.</EmptyCard>
            ) : (
              applicants.map((a, i) => (
                <ApplicantCard key={a.uid + i}>
                  <ApplicantHeader>
                    <ApplicantAvatar src={a.photo || "/default-avatar.png"} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                    <ApplicantName>{a.name || "익명 작업자"}</ApplicantName>
                  </ApplicantHeader>
                  {a.message && <ApplicantMsg>{a.message}</ApplicantMsg>}
                  <ApplicantActions>
                    <ChatBtn disabled={chatStarting} onClick={() => handleChat(a.uid, a.name, a.photo)}>채팅 시작</ChatBtn>
                  </ApplicantActions>
                </ApplicantCard>
              ))
            )}
          </>
        ) : (
          <>
            {!alreadyApplied && (
              <Card>
                <SectionLabel>응답하기</SectionLabel>
                <ResponseTextarea
                  placeholder="간단한 소개나 일정 가능 여부를 입력해주세요 (선택)"
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  maxLength={300}
                />
                <PrimaryBtn disabled={responding} onClick={handleApply}>
                  {responding ? "등록 중..." : "응답 등록"}
                </PrimaryBtn>
              </Card>
            )}
            {alreadyApplied && (
              <NoticeCard>이미 응답하셨습니다. 작성자가 채팅을 시작하면 알림을 받게 됩니다.</NoticeCard>
            )}
            <Card>
              <SectionLabel>작성자에게 직접 문의</SectionLabel>
              <SecondaryBtn
                disabled={chatStarting || !request.createdBy}
                onClick={() => handleChat(request.createdBy, request.writer, "")}
              >
                {chatStarting ? "채팅방 생성 중..." : "채팅 문의"}
              </SecondaryBtn>
            </Card>
          </>
        )}

        {toast && <Toast>{toast}</Toast>}
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default WorkerRequestDetailPage;

const PageWrap = styled.div`
  padding: 12px 12px 80px;
  max-width: 400px;
  margin: 0 auto;
  background: ${THEME.background};
  min-height: 100vh;
`;
const CenterMsg = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: ${THEME.muted};
  font-size: 14px;
`;
const HeaderCard = styled.div`
  background: ${THEME.surface};
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 12px;
`;
const CategoryTag = styled.div`
  display: inline-block;
  padding: 4px 10px;
  background: ${THEME.purpleLight};
  color: ${THEME.primary};
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  margin-bottom: 10px;
`;
const Title = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.4;
  margin-bottom: 10px;
  white-space: pre-wrap;
  word-break: break-word;
`;
const SubMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${THEME.muted};
`;
const Dot = styled.span`
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: ${THEME.muted};
`;
const ApplyCount = styled.span`
  color: ${THEME.primary};
  font-weight: 600;
`;
const Card = styled.div`
  background: ${THEME.surface};
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 12px;
`;
const Row = styled.div`
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;
const Key = styled.div`
  flex: 0 0 88px;
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.textSecondary || THEME.muted};
`;
const Val = styled.div`
  flex: 1;
  font-size: 14px;
  color: ${THEME.text};
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
`;
const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 16px 4px 8px;
`;
const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.textSecondary || THEME.muted};
  margin-bottom: 10px;
`;
const EmptyCard = styled.div`
  background: ${THEME.surface};
  padding: 32px 20px;
  border-radius: 16px;
  text-align: center;
  color: ${THEME.muted};
  font-size: 13px;
`;
const ApplicantCard = styled.div`
  background: ${THEME.surface};
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 8px;
`;
const ApplicantHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;
const ApplicantAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background: ${THEME.background};
`;
const ApplicantName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;
const ApplicantMsg = styled.div`
  font-size: 13px;
  color: ${THEME.textSecondary || THEME.text};
  background: ${THEME.background};
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 10px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
`;
const ApplicantActions = styled.div`
  display: flex;
  gap: 8px;
`;
const ChatBtn = styled.button`
  padding: 8px 16px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:active { background: ${THEME.primaryDark}; }
  &:disabled { opacity: 0.5; }
`;
const ResponseTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  outline: none;
  margin-bottom: 10px;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
`;
const PrimaryBtn = styled.button`
  width: 100%;
  padding: 14px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:active { background: ${THEME.primaryDark}; }
  &:disabled { background: #ccc; }
`;
const SecondaryBtn = styled.button`
  width: 100%;
  padding: 14px;
  background: ${THEME.surface};
  color: ${THEME.primary};
  border: 1.5px solid ${THEME.primary};
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:active { background: ${THEME.purpleLight}; }
  &:disabled { opacity: 0.5; }
`;
const NoticeCard = styled.div`
  background: ${THEME.purpleLight};
  color: ${THEME.primary};
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
  font-weight: 500;
`;
const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
`;
