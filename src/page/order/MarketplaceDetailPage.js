/* eslint-disable */
/**
 * 양도·매매 매물 상세
 * URL: /marketplace/:marketplaceId
 *
 * - 금액(권리금·보증금/월세) · 운영 현황 · 포함 내역 · 상세 설명 · 양도 사유
 * - 민감 정보(월 평균 매출·상주 인력·상세·사유·연락처)는 로그인 사용자에게만
 * - 타인: [비밀채팅 문의] + [전화하기] / 작성자: 거래 상태 변경 + 삭제
 * - 예전 시트7 글(tradeType/amount/contact 등)도 그대로 표시
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { doc, onSnapshot, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { createChatRoom } from "../../service/ChatService";
import { formatPhone } from "../../utility/common";
import {
  MARKET_COLLECTION, STATUSES, INCLUDE_OPTIONS, getCategory, getStatus,
  premiumText, rentText, regionText, timeAgo, TabBox, TabItem,
} from "./MarketplaceShared";

const MarketplaceDetailPage = () => {
  const navigate = useNavigate();
  const { marketplaceId } = useParams();
  const { userData } = useAuth();
  const myUid = userData?.uid || "";

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [chatStarting, setChatStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  useEffect(() => {
    if (!marketplaceId) return;
    const unsub = onSnapshot(
      doc(db, MARKET_COLLECTION, marketplaceId),
      (snap) => {
        setPost(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [marketplaceId]);

  if (loading || !post) {
    return (
      <SimpleBackLayout NAME="매물 상세" hideFooter>
        <CenterMsg>{loading ? "불러오는 중..." : "매물을 찾을 수 없습니다."}</CenterMsg>
      </SimpleBackLayout>
    );
  }

  const isOwner = !!myUid && post.createdBy === myUid;
  const loggedIn = !!myUid;
  const images = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
  const cat = getCategory(post);
  const st = getStatus(post);
  const rent = rentText(post);
  const inc = Array.isArray(post.includes) ? post.includes : [];
  const phone = post.authorPhone || post.contact || "";
  const isLegacy = !post.category;

  const handleChat = async () => {
    if (!myUid) { showToast("로그인이 필요합니다"); return; }
    if (!post.createdBy || isOwner || chatStarting) return;
    setChatStarting(true);
    try {
      const myName = userData?.companyName || userData?.nickname || userData?.name || "";
      const myPhoto = userData?.profileImage || userData?.photoURL || "";
      const roomId = await createChatRoom(
        myUid, myName, myPhoto,
        post.createdBy, post.writer || "작성자", post.writerPhoto || "",
        { type: "marketplace" }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error(e);
      showToast("채팅을 시작하지 못했습니다");
    } finally {
      setChatStarting(false);
    }
  };

  const handleCall = () => {
    if (!myUid) { showToast("로그인이 필요합니다"); return; }
    const digits = String(phone).replace(/[^0-9+]/g, "");
    if (!digits) { window.alert("등록자가 연락처를 남기지 않았습니다. 비밀채팅으로 문의해주세요."); return; }
    window.location.href = `tel:${digits}`;
  };

  const changeStatus = async (key) => {
    if (!isOwner || busy || key === st.key) return;
    const label = STATUSES.find((s) => s.key === key)?.label;
    if (!window.confirm(`거래 상태를 '${label}'(으)로 바꿀까요?`)) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, MARKET_COLLECTION, marketplaceId), { status: key, updatedAt: serverTimestamp() });
      showToast("상태를 변경했습니다");
    } catch (e) {
      console.error(e);
      showToast("상태 변경에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner || busy) return;
    if (!window.confirm("매물을 삭제하시겠습니까?")) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, MARKET_COLLECTION, marketplaceId));
      showToast("삭제되었습니다");
      setTimeout(() => navigate(-1), 500);
    } catch (e) {
      console.error(e);
      showToast("삭제에 실패했습니다");
      setBusy(false);
    }
  };

  return (
    <SimpleBackLayout NAME="매물 상세" hideFooter>
      <Wrap>
        {images.length > 0 && (
          <PhotoBox>
            <MainImg src={images[Math.min(photoIdx, images.length - 1)]} alt="" />
            {images.length > 1 && (
              <ThumbRow>
                {images.map((url, i) => (
                  <Thumb key={i} type="button" $active={i === photoIdx} onClick={() => setPhotoIdx(i)}>
                    <ThumbImg src={url} alt="" />
                  </Thumb>
                ))}
              </ThumbRow>
            )}
          </PhotoBox>
        )}

        <Card>
          <TopLine>
            <StatusText style={{ color: st.color }}>{st.label}</StatusText>
            <Meta>{regionText(post)} · {timeAgo(post.createdAt)}</Meta>
          </TopLine>
          <CatText>{isLegacy && post.tradeType ? `${cat.tag} (${post.tradeType})` : cat.tag}</CatText>
          <Title>{post.title}</Title>
          <Price>{premiumText(post)}</Price>
          {rent && <Rent>{rent}</Rent>}
        </Card>

        {!loggedIn ? (
          <Card>
            <LockText>월 평균 매출, 거래처, 상세 설명과 연락처는 로그인 후 확인할 수 있습니다.</LockText>
          </Card>
        ) : (
          <>
            <Card>
              <SecTitle>운영 현황 및 조건</SecTitle>
              <InfoRow><Key>거래 형태</Key><Val>{cat.formLabel}</Val></InfoRow>
              <InfoRow><Key>지역</Key><Val>{regionText(post)}</Val></InfoRow>
              {post.premium != null && <InfoRow><Key>권리금</Key><Val>{premiumText(post).replace(/^권리금 /, "")}</Val></InfoRow>}
              {cat.key === "space" && (
                <>
                  <InfoRow><Key>보증금</Key><Val>{post.depositMan != null ? `${Number(post.depositMan).toLocaleString()}만원` : "없음"}</Val></InfoRow>
                  <InfoRow><Key>월세</Key><Val>{post.monthlyRentMan != null ? `${Number(post.monthlyRentMan).toLocaleString()}만원` : "없음"}</Val></InfoRow>
                </>
              )}
              <InfoRow><Key>월 평균 매출</Key><Val>{post.monthlySales || "미기재"}</Val></InfoRow>
              <InfoRow><Key>상주 인력</Key><Val>{post.staffInfo || "미기재"}</Val></InfoRow>
              {isLegacy && (
                <>
                  {post.contractType && <InfoRow><Key>계약방식</Key><Val>{post.contractType}</Val></InfoRow>}
                  {post.memberType && <InfoRow><Key>회원유형</Key><Val>{post.memberType}</Val></InfoRow>}
                  {post.companyName && <InfoRow><Key>업체명</Key><Val>{post.companyName}</Val></InfoRow>}
                  {post.managerName && <InfoRow><Key>담당자</Key><Val>{post.managerName}</Val></InfoRow>}
                  {post.contact && <InfoRow><Key>연락처</Key><Val>{formatPhone(post.contact)}</Val></InfoRow>}
                </>
              )}
            </Card>

            {!isLegacy && (
              <Card>
                <SecTitle>포함 내역</SecTitle>
                <IncGrid>
                  {INCLUDE_OPTIONS.map((o) => {
                    const on = inc.includes(o.key);
                    return (
                      <IncItem key={o.key} $on={on}>
                        <span>{on ? "포함" : "미포함"}</span>
                        {o.label}
                      </IncItem>
                    );
                  })}
                </IncGrid>
              </Card>
            )}

            <Card>
              <SecTitle>상세 설명</SecTitle>
              <Body>{post.description || "내용 없음"}</Body>
            </Card>

            {post.transferReason && (
              <Card>
                <SecTitle>양도 사유</SecTitle>
                <Body>{post.transferReason}</Body>
              </Card>
            )}

            <Card>
              <SecTitle>등록자</SecTitle>
              <Author>
                {post.writerPhoto ? <Avatar src={post.writerPhoto} alt="" /> : <AvatarBlank />}
                <div>
                  <AuthorName>{post.writer || "등록자"}</AuthorName>
                  <Meta>{isOwner ? "내가 등록한 매물" : post.authorSubscribed ? "월 구독 사업자" : "홈프로 회원"}</Meta>
                </div>
              </Author>
            </Card>
          </>
        )}

        {isOwner ? (
          <Card>
            <SecTitle>거래 상태 변경</SecTitle>
            <TabBox>
              {STATUSES.map((s) => (
                <TabItem key={s.key} type="button" $active={st.key === s.key} disabled={busy} onClick={() => changeStatus(s.key)}>
                  {s.label}
                </TabItem>
              ))}
            </TabBox>
            <OutlineBtn type="button" style={{ marginTop: 14, color: THEME.danger }} disabled={busy} onClick={handleDelete}>
              매물 삭제
            </OutlineBtn>
          </Card>
        ) : (
          <Actions>
            {st.key === "done" && <LockText style={{ marginBottom: 10 }}>거래가 완료된 매물입니다.</LockText>}
            <PrimaryBtn type="button" disabled={chatStarting || !post.createdBy} onClick={handleChat}>
              {chatStarting ? "채팅방 여는 중..." : "비밀채팅 문의"}
            </PrimaryBtn>
            <OutlineBtn type="button" style={{ marginTop: 8 }} onClick={handleCall}>전화하기</OutlineBtn>
          </Actions>
        )}

        <Disclaimer>
          홈프로는 정보 등록·연결 서비스이며 거래 당사자가 아닙니다. 계약 전 매출 자료·임대차 계약·거래처 현황을 직접 확인하고,
          선입금 요구 등 의심 정황이 있으면 거래를 중단하고 신고해주세요.
        </Disclaimer>

        {toast && <Toast>{toast}</Toast>}
      </Wrap>
    </SimpleBackLayout>
  );
};

export default MarketplaceDetailPage;

const Wrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding: 12px 16px 48px;
`;
const CenterMsg = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: ${THEME.muted};
  font-size: 16px;
`;
const PhotoBox = styled.div`
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #e2e5ea;
`;
const MainImg = styled.img`
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  display: block;
  background: #111;
`;
const ThumbRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px;
  overflow-x: auto;
`;
const Thumb = styled.button`
  flex: none;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 2px solid ${({ $active }) => ($active ? THEME.text : "transparent")};
  background: ${THEME.background};
  cursor: pointer;
  overflow: hidden;
`;
const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
const Card = styled.div`
  background: #fff;
  border: 1px solid #e2e5ea;
  padding: 16px;
  margin-bottom: 10px;
`;
const TopLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;
const StatusText = styled.span`
  font-size: 15px;
  font-weight: 700;
  flex: none;
`;
const Meta = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
`;
const CatText = styled.div`
  margin-top: 10px;
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.textSecondary};
`;
const Title = styled.div`
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  color: ${THEME.text};
  word-break: break-word;
`;
const Price = styled.div`
  margin-top: 10px;
  font-size: 21px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.3px;
`;
const Rent = styled.div`
  margin-top: 2px;
  font-size: 15px;
  color: ${THEME.textSecondary};
`;
const SecTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 10px;
`;
const InfoRow = styled.div`
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid #eef0f3;
  &:first-of-type { border-top: none; }
`;
const Key = styled.div`
  flex: 0 0 96px;
  font-size: 15px;
  color: ${THEME.muted};
`;
const Val = styled.div`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  word-break: break-word;
`;
const IncGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  @media (max-width: 360px) { grid-template-columns: 1fr; }
`;
const IncItem = styled.div`
  padding: 10px;
  border: 1px solid #e2e5ea;
  font-size: 15px;
  color: ${({ $on }) => ($on ? THEME.text : THEME.muted)};
  font-weight: ${({ $on }) => ($on ? 600 : 400)};
  line-height: 1.45;
  word-break: keep-all;
  span {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: ${({ $on }) => ($on ? THEME.primaryDark : THEME.muted)};
  }
`;
const Body = styled.div`
  font-size: 15px;
  line-height: 1.7;
  color: ${THEME.text};
  white-space: pre-wrap;
  word-break: break-word;
`;
const LockText = styled.div`
  font-size: 15px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;
const Author = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
const Avatar = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: ${THEME.background};
`;
const AvatarBlank = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e9ecf1;
`;
const AuthorName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;
const Actions = styled.div`
  margin: 14px 0 10px;
`;
const PrimaryBtn = styled.button`
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 8px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.primaryDark}; }
  &:disabled { background: #b8bec7; cursor: not-allowed; }
`;
const OutlineBtn = styled.button`
  width: 100%;
  height: 48px;
  border: 1px solid #cfd4dc;
  border-radius: 8px;
  background: #fff;
  color: ${THEME.text};
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: #f3f4f6; }
  &:disabled { opacity: 0.5; }
`;
const Disclaimer = styled.div`
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: ${THEME.muted};
  word-break: keep-all;
`;
const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 18px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-size: 15px;
  border-radius: 8px;
  z-index: 9999;
  white-space: nowrap;
`;
