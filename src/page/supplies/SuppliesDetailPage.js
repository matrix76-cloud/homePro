/* eslint-disable */
// 자재·장비 거래글 상세 (대표 스펙 9/15)
// 사진 · 전체 항목 · 등록자 · 전화/채팅 · 작성자 거래완료 처리
// 예전 업체 소개글(tradeType 없음)도 깨지지 않게 업체 정보 표로 보여준다.
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { IoCallOutline, IoChatbubbleEllipsesOutline, IoImageOutline } from "react-icons/io5";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { createChatRoom } from "../../service/ChatService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import {
  SUPPLIES_COL, isLegacy, tradeLabel, categoryLabel, conditionLabel, formatPrice,
  dealMethodText, formatDate, LINE, ACTIVE_FACE, INK_BUTTON, DONE_COLOR,
} from "./suppliesConstants";
import { pcOnly, PC } from "../../pc/pcKit";

const SuppliesDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const myUid = userData?.uid;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef(null);
  const slidesRef = useRef(null);
  // PC 는 마우스로 옆으로 밀기 어려워 이전·다음 버튼으로 사진을 넘긴다 (버튼은 PC 에서만 보인다)
  const moveSlide = (dir) => {
    const el = slidesRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, SUPPLIES_COL, id),
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error("자재·장비 상세 로드 실패:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  const legacy = isLegacy(data);
  const isAuthor = !!myUid && data?.createdBy === myUid;
  const isDone = data?.status === "done";
  const phone = legacy ? data?.phone : data?.contactPhone;
  const images = Array.isArray(data?.images) ? data.images.filter(Boolean) : [];
  const displayTitle = legacy ? data?.name || "업체" : data?.title || "";

  const handleCall = () => {
    if (!phone) return showToast("연락처를 남기지 않은 글입니다. 채팅으로 문의해주세요");
    window.location.href = `tel:${String(phone).replace(/[^0-9+]/g, "")}`;
  };

  const handleChat = async () => {
    if (!myUid) return showToast("로그인이 필요합니다");
    if (!data?.createdBy) return showToast("등록자 정보가 없어 채팅할 수 없습니다");
    if (isAuthor) return showToast("본인이 등록한 글입니다");
    try {
      const roomId = await createChatRoom(
        myUid,
        userData?.companyName || userData?.nickname || userData?.name || "",
        userData?.profileImage || userData?.photoURL || "",
        data.createdBy,
        data.authorName || displayTitle || "판매자",
        data.authorPhoto || "",
        { supplyId: data.id, supplyTitle: displayTitle }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error("채팅 시작 실패:", e);
      showToast("채팅 시작에 실패했습니다");
    }
  };

  const toggleDone = async () => {
    if (!isAuthor || busy) return;
    const next = isDone ? "active" : "done";
    const msg = isDone ? "이 글을 다시 거래중으로 바꿀까요?" : "거래완료로 바꿀까요?\n목록에 거래완료로 표시되고 연락 버튼이 닫힙니다.";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, SUPPLIES_COL, data.id), {
        status: next,
        doneAt: next === "done" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
      showToast(next === "done" ? "거래완료로 변경했습니다" : "다시 거래중으로 변경했습니다");
    } catch (e) {
      console.error("상태 변경 실패:", e);
      showToast("변경에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !data) {
    return (
      <SimpleBackLayout NAME="자재·장비" hideFooter>
        <Center>{loading ? "불러오는 중..." : "삭제되었거나 존재하지 않는 글입니다"}</Center>
      </SimpleBackLayout>
    );
  }

  const rows = legacy
    ? [
        ["구분", "업체 소개(이전 등록글)"],
        ["지역", data.location || "-"],
        ["연락처", data.phone || "-"],
        ["영업시간", data.hours || "-"],
        ["배송", data.deliveryAvailable ? "배송 가능" : "-"],
        ["취급 품목", Array.isArray(data.items) && data.items.length ? data.items.join(", ") : "-"],
        ["등록일", formatDate(data.createdAt) || "-"],
      ]
    : [
        ["거래 종류", tradeLabel(data.tradeType) || "-"],
        ["카테고리", categoryLabel(data.category) || "-"],
        [data.tradeType === "buy" ? "원하는 상태" : "물품 상태", conditionLabel(data.condition) || "-"],
        ["가격", formatPrice(data)],
        ...(data.tradeType !== "free" ? [["가격 조정", data.negotiable ? "네고 가능" : "제안 불가"]] : []),
        ["거래 방법", dealMethodText(data) || "-"],
        ...(Array.isArray(data.dealMethods) && data.dealMethods.includes("direct")
          ? [["직거래 장소", data.directPlace || "-"]]
          : []),
        ["지역", data.location || "-"],
        ["등록일", formatDate(data.createdAt) || "-"],
      ];

  return (
    <SimpleBackLayout NAME="자재·장비" hideFooter>
      {toast && <ToastWrap>{toast}</ToastWrap>}
      <PageWrap>
        {!legacy && (
          <Gallery>
            {images.length ? (
              <>
                <Slides
                  ref={slidesRef}
                  onScroll={(e) => {
                    const w = e.currentTarget.clientWidth || 1;
                    setPhotoIdx(Math.round(e.currentTarget.scrollLeft / w));
                  }}
                >
                  {images.map((src, i) => (
                    <Slide key={i}>
                      <img src={src} alt="" />
                    </Slide>
                  ))}
                </Slides>
                {images.length > 1 && <Counter>{photoIdx + 1} / {images.length}</Counter>}
                {images.length > 1 && (
                  <SlideNav>
                    <button type="button" onClick={() => moveSlide(-1)} disabled={photoIdx === 0}>이전 사진</button>
                    <button type="button" onClick={() => moveSlide(1)} disabled={photoIdx >= images.length - 1}>다음 사진</button>
                  </SlideNav>
                )}
              </>
            ) : (
              <NoPhoto>
                <IoImageOutline size={34} color={THEME.muted} />
                <span>등록된 사진이 없습니다</span>
              </NoPhoto>
            )}
            {isDone && <DoneCover>거래완료</DoneCover>}
          </Gallery>
        )}

        <Section>
          <TopLine>
            <TypeText $type={data.tradeType}>{legacy ? "업체" : tradeLabel(data.tradeType)}</TypeText>
            {!legacy && <span>{categoryLabel(data.category)}</span>}
            <StateText $done={isDone}>{legacy ? "" : isDone ? "거래완료" : "거래중"}</StateText>
          </TopLine>
          <Title>{displayTitle}</Title>
          {!legacy && (
            <PriceLine>
              <Price $free={data.tradeType === "free"}>{formatPrice(data)}</Price>
              {data.tradeType !== "free" && <Nego>{data.negotiable ? "네고 가능" : "제안 불가"}</Nego>}
            </PriceLine>
          )}
        </Section>

        <Section>
          <SectionTitle>{legacy ? "업체 정보" : "거래 정보"}</SectionTitle>
          <InfoTable>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </InfoTable>
        </Section>

        {data.description && (
          <Section>
            <SectionTitle>{legacy ? "업체 소개" : "상세 설명"}</SectionTitle>
            <Body>{data.description}</Body>
          </Section>
        )}

        {!legacy && (
          <Section>
            <SectionTitle>등록자</SectionTitle>
            <Seller>
              {data.authorPhoto ? <Avatar src={data.authorPhoto} alt="" /> : <AvatarBlank />}
              <div>
                <SellerName>{data.authorName || "홈프로 회원"}</SellerName>
                <SellerMeta>
                  {data.authorSubscribed ? "월 구독 회원" : "일반 회원"}
                  {phone ? ` · ${phone}` : " · 채팅으로 연락"}
                </SellerMeta>
              </div>
            </Seller>
          </Section>
        )}

        <Caution>
          홈프로는 회원 간 직거래를 연결하는 공간이며 거래에 개입하거나 보증하지 않습니다. 물품 상태와 작동 여부는 직접 확인한 뒤 거래해주세요.
        </Caution>

      {/* 폰: 영향 없는 틀(display: contents, 버튼 바는 그대로 화면 바닥 고정) / PC: 오른쪽 고정 패널 */}
      <Side>
        <SideSummary>
          <TopLine>
            <TypeText $type={data.tradeType}>{legacy ? "업체" : tradeLabel(data.tradeType)}</TypeText>
            <StateText $done={isDone}>{legacy ? "" : isDone ? "거래완료" : "거래중"}</StateText>
          </TopLine>
          {!legacy && <SidePrice $free={data.tradeType === "free"}>{formatPrice(data)}</SidePrice>}
          {!legacy && data.tradeType !== "free" && <SideRow><span>가격 조정</span><b>{data.negotiable ? "네고 가능" : "제안 불가"}</b></SideRow>}
          {!legacy && <SideRow><span>거래 방법</span><b>{dealMethodText(data) || "-"}</b></SideRow>}
          <SideRow><span>지역</span><b>{data.location || "-"}</b></SideRow>
          <SideRow><span>{legacy ? "업체" : "등록자"}</span><b>{legacy ? displayTitle : data.authorName || "홈프로 회원"}</b></SideRow>
        </SideSummary>
      <BottomBar>
        {isAuthor ? (
          <OutlineBtn type="button" onClick={toggleDone} disabled={busy} style={{ flex: 1 }}>
            {isDone ? "다시 거래중으로 변경" : "거래완료로 변경"}
          </OutlineBtn>
        ) : isDone ? (
          <DoneNote>거래가 완료된 글입니다</DoneNote>
        ) : (
          <>
            <OutlineBtn type="button" onClick={handleCall}>
              <IoCallOutline size={18} /> 전화
            </OutlineBtn>
            <FilledBtn type="button" onClick={handleChat}>
              <IoChatbubbleEllipsesOutline size={18} /> 채팅 문의
            </FilledBtn>
          </>
        )}
      </BottomBar>
      </Side>
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default SuppliesDetailPage;

/* ===== styles ===== */
const PageWrap = styled.div`
  padding: 0 0 100px;
  background: ${THEME.background};
  min-height: 100%;
  /* PC: 좌우 2단 — 왼쪽 내용 / 오른쪽 고정 패널 */
  ${pcOnly`
    display: grid; grid-template-columns: minmax(0, 1fr) 360px; column-gap: 24px; align-items: start; align-content: start;
    min-height: 0; padding: 24px 32px 80px; box-sizing: border-box; word-break: keep-all;
  `}
`;

const Side = styled.div`
  display: contents;
  ${pcOnly`
    display: block; grid-column: 2; grid-row: 1 / span 40; position: sticky; top: 24px; /* 나머지 자식은 자동으로 왼쪽 칸에 쌓인다 */
    background: #fff; border: 1px solid ${PC.line}; padding: 24px 24px 22px; box-sizing: border-box;
  `}
`;
const SideSummary = styled.div` display: none; ${pcOnly`display: block;`} `;
const SidePrice = styled.div`
  font-size: 24px; font-weight: 800; margin: 6px 0 14px; line-height: 1.35;
  color: ${({ $free }) => ($free ? THEME.primaryDark : PC.ink)};
`;
const SideRow = styled.div`
  display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid ${PC.line}; font-size: 15px; color: ${PC.ink};
  span { flex: none; } b { font-weight: 700; text-align: right; line-height: 1.45; }
`;
const SlideNav = styled.div`
  display: none;
  ${pcOnly`
    display: flex; gap: 8px; position: absolute; left: 12px; bottom: 12px;
    button {
      height: 36px; padding: 0 14px; border: 1px solid ${PC.line}; background: #fff; color: ${PC.ink};
      font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
      &:disabled { opacity: 0.5; cursor: default; }
    }
  `}
`;

const Gallery = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: 400px;
  background: #eef0f3;
  ${pcOnly`aspect-ratio: auto; height: 420px; max-height: none; border: 1px solid ${PC.line}; box-sizing: border-box; margin-bottom: 16px; img { object-fit: contain; }`}
`;

const Slides = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Slide = styled.div`
  flex: 0 0 100%;
  height: 100%;
  scroll-snap-align: start;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const Counter = styled.div`
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 4px 10px;
  background: rgba(20, 24, 31, 0.7);
  color: #fff;
  font-size: 13px;
`;

const NoPhoto = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: ${THEME.textSecondary};
`;

const DoneCover = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(20, 24, 31, 0.5);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const Section = styled.div`
  background: #fff;
  border-bottom: 1px solid ${LINE};
  padding: 18px 16px;
  margin-bottom: 8px;
  ${pcOnly`border: 1px solid ${PC.line}; padding: 26px 28px; margin-bottom: 16px;`}
`;

const TopLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${THEME.textSecondary};
  margin-bottom: 6px;
`;

const TypeText = styled.span`
  font-weight: 700;
  color: ${({ $type }) => ($type === "free" ? THEME.primaryDark : $type === "buy" ? "#b45309" : THEME.text)};
`;

const StateText = styled.span`
  margin-left: auto;
  font-weight: 700;
  color: ${({ $done }) => ($done ? DONE_COLOR : THEME.primaryDark)};
`;

const Title = styled.h2`
  font-size: 21px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0;
  line-height: 1.35;
  word-break: keep-all;
`;

const PriceLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 10px;
  ${pcOnly`display: none;`} /* PC 는 오른쪽 패널에 금액 */
`;

const Price = styled.span`
  font-size: 22px;
  font-weight: 700;
  color: ${({ $free }) => ($free ? THEME.primaryDark : THEME.text)};
`;

const Nego = styled.span`
  font-size: 15px;
  color: ${THEME.textSecondary};
`;

const SectionTitle = styled.h3`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0 0 12px;
`;

const InfoTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  border: 1px solid ${LINE};
  th, td {
    border-bottom: 1px solid ${LINE};
    padding: 11px 12px;
    font-size: 15px;
    text-align: left;
    vertical-align: top;
    line-height: 1.45;
    word-break: keep-all;
  }
  tr:last-child th, tr:last-child td { border-bottom: none; }
  ${pcOnly`th, td { font-size: 16px; padding: 13px 16px; } th { width: 140px; }`}
  th {
    width: 96px;
    background: #f4f5f7;
    color: ${THEME.textSecondary};
    font-weight: 600;
  }
  td { color: ${THEME.text}; }
`;

const Body = styled.p`
  font-size: 16px;
  color: ${THEME.text};
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  word-break: keep-all;
`;

const Seller = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
`;

const AvatarBlank = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e3e6ea;
  flex: none;
`;

const SellerName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const SellerMeta = styled.div`
  font-size: 14px;
  color: ${THEME.textSecondary};
  margin-top: 2px;
`;

const Caution = styled.div`
  padding: 6px 16px 10px;
  ${pcOnly`padding: 0 2px; color: ${PC.body};`}
  font-size: 13px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const Center = styled.div`
  padding: 80px 0;
  text-align: center;
  font-size: 16px;
  color: ${THEME.text};
`;

const BottomBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--app-max, 400px);
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: #fff;
  border-top: 1px solid ${LINE};
  z-index: 100;
  display: flex;
  gap: 8px;
  ${pcOnly`position: static; transform: none; width: auto; max-width: none; padding: 16px 0 0; background: none; border-top: 1px solid ${PC.line};`}
`;

const BaseBtn = styled.button`
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const OutlineBtn = styled(BaseBtn)`
  flex: 0 0 38%;
  border: 1px solid #c9ced6;
  background: #fff;
  color: ${THEME.text};
  &:active { background: ${ACTIVE_FACE}; }
`;

const FilledBtn = styled(BaseBtn)`
  flex: 1;
  border: none;
  background: ${INK_BUTTON};
  color: #fff;
  &:active { opacity: 0.88; }
`;

const DoneNote = styled.div`
  flex: 1;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${ACTIVE_FACE};
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ToastWrap = styled.div`
  position: fixed;
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 360px;
  width: max-content;
  background: ${THEME.text};
  color: #fff;
  padding: 11px 18px;
  font-size: 15px;
  line-height: 1.4;
  text-align: center;
  z-index: 9999;
`;
