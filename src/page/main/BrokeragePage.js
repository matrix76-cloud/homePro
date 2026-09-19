/* eslint-disable */
// 공동중개 = 공인중개 라운지 — 손님찾기/매물등록 카드 피드 + 채팅 매칭
import { getBrokerStatus } from "../../service/BrokerService";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import { getBrokeragePosts, getMyBrokeragePosts, setBrokeragePostStatus, DEAL_TYPES } from "../../service/BrokerageService";
import { createChatRoom } from "../../service/ChatService";
import { IoChatbubbleEllipsesOutline, IoLocationOutline, IoAddCircle } from "react-icons/io5";
import usePcWide from "../../hooks/usePcWide";
import { pcOnly, PC, PcTable, PcTHead, PcTRow, PcEmpty } from "../../pc/pcKit";

// PC 표 칸: 등록일 · 구분 · 상태 · 제목 · 지역 · 종류/거래 · 금액 · 등록자 · 버튼
const PC_COLS = "68px 76px 68px minmax(0, 1.9fr) minmax(0, 0.9fr) minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 1fr) 116px"; // 창이 좁아져도 넘치지 않게 최소폭 0 + 줄바꿈

// 대표 9/10 최종 구성: 상단 탭 매물공유 / 손님공유 (+ 내 글)
const TABS = [
  { key: "listing", label: "매물공유" },
  { key: "demand", label: "손님공유" },
  { key: "mine", label: "내 글" },
];
const CONTRACT_FILTERS = ["전체", "매매", "전세", "월세"];

const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const BrokeragePage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide(); // PC 에서는 카드 나열 대신 표로 그린다 (거르기·버튼 동작은 같다)
  const { userData } = useAuth();
  const { user } = React.useContext(UserContext);
  const uid = userData?.uid || user?.USERS_ID;

  const [tab, setTab] = useState("listing");
  // 필터 (대표 9/10): 지역 · 매물 종류 · 거래 형태
  const [regionQ, setRegionQ] = useState("");
  const [dealFilter, setDealFilter] = useState("전체");
  const [contractFilter, setContractFilter] = useState("전체");
  const [selected, setSelected] = useState(null); // 상세 시트
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getBrokeragePosts()
      .then((list) => { if (alive) setPosts(list); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // 내 글 (거래 종료 관리, 대표 9/10) — 종료된 글도 여기서만 보인다
  const [myPosts, setMyPosts] = useState([]);
  const loadMine = async () => { if (uid) setMyPosts(await getMyBrokeragePosts(uid)); };
  useEffect(() => { if (tab === "mine") loadMine(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, uid]);
  const toggleClose = async (p) => {
    const closing = p.status !== "closed";
    if (!window.confirm(closing ? "이 글을 거래 종료로 바꿀까요?\n리스트에서 내려가고 다른 중개사에게 안 보입니다." : "이 글을 다시 열까요?")) return;
    try {
      await setBrokeragePostStatus(p.id, closing ? "closed" : "open");
      await loadMine();
      getBrokeragePosts().then(setPosts).catch(() => {});
    } catch { window.alert("처리에 실패했습니다."); }
  };
  const applyFilters = (list) => list.filter((p) => {
    if (regionQ.trim() && !String(p.region || "").includes(regionQ.trim())) return false;
    if (dealFilter !== "전체" && p.dealType !== dealFilter) return false;
    if (contractFilter !== "전체" && p.contractType !== contractFilter) return false;
    return true;
  });
  const filtered = tab === "mine" ? myPosts : applyFilters(posts.filter((p) => p.type === tab));
  const callAuthor = (post) => {
    if (post.type === "demand" && !isBroker) { askRegister(); return; }
    if (!post.authorPhone) { window.alert("등록자가 연락처를 남기지 않았습니다. 채팅으로 연결해 주세요."); return; }
    window.location.href = `tel:${post.authorPhone}`;
  };

  // 인증 공인중개사 판정 — 글쓰기·손님공유 연결 권한 (대표 9/10)
  const [brokerStatus, setBrokerStatus] = useState("none"); // none | pending | approved
  useEffect(() => {
    let alive = true;
    getBrokerStatus(uid).then((s) => { if (alive) setBrokerStatus(s); });
    return () => { alive = false; };
  }, [uid]);
  const isBroker = brokerStatus === "approved";
  const askRegister = () => {
    const msg = brokerStatus === "pending"
      ? "공인중개사 인증을 관리자가 확인하는 중입니다. 승인되면 이용할 수 있어요."
      : "인증 공인중개사만 이용할 수 있어요.\n중개사무소 개설등록번호로 인증을 신청해 주세요.";
    if (brokerStatus === "pending") { window.alert(msg); return; }
    if (window.confirm(msg + "\n\n지금 인증하러 갈까요?")) navigate("/pro/register-category?category=brokerage");
  };

  const startChat = async (post) => {
    if (!uid) { window.alert("로그인이 필요합니다."); return; }
    if (post.authorUid === uid) { window.alert("본인 게시글입니다."); return; }
    // 손님공유(demand) 상세·연결은 공인중개사만, 매물공유(listing)는 회원이면 가능 (대표 9/10)
    if (post.type === "demand" && !isBroker) { askRegister(); return; }
    try {
      const myName = userData?.companyName || userData?.nickname || userData?.name || "중개사";
      const myPhoto = userData?.profileImage || userData?.photoURL || "";
      const roomId = await createChatRoom(
        uid, myName, myPhoto,
        post.authorUid, post.authorCompany || "중개사", "",
        { type: "brokerage" }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      window.alert("채팅방을 열지 못했습니다.");
    }
  };

  return (
    <MainListLayout NAME="공동중개" footerType="brokerage" hideBack hideActions>
      <Wrap>
        <NoticeBar>개업 공인중개사 전용 공동중개 라운지 · 글쓰기/읽기 무료</NoticeBar>

        <TabRow>
          {TABS.map((t) => (
            <TabBtn key={t.key} $active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>
          ))}
        </TabRow>
        {tab !== "mine" && (
          <FilterBox>
            <FilterItem $w={280}>
              {pcWide && <FilterLabel>지역</FilterLabel>}
              <FilterInput placeholder="지역 (시·군·구 / 읍·면·동)" value={regionQ} onChange={(e) => setRegionQ(e.target.value)} />
            </FilterItem>
            <FilterItem $w={300}>
              {pcWide && <FilterLabel>매물 종류</FilterLabel>}
              <FilterSelect value={dealFilter} onChange={(e) => setDealFilter(e.target.value)}>
                <option value="전체">매물 종류 전체</option>
                {DEAL_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </FilterSelect>
            </FilterItem>
            <FilterItem $w={320}>
              {pcWide && <FilterLabel>거래 유형</FilterLabel>}
              <FilterChips>
                {CONTRACT_FILTERS.map((c) => (
                  <FilterChip key={c} $active={contractFilter === c} onClick={() => setContractFilter(c)}>{c}</FilterChip>
                ))}
              </FilterChips>
            </FilterItem>
          </FilterBox>
        )}

        {pcWide ? (
          <PcTableWrap>
          <PcTable>
            <PcTHead $cols={PC_COLS}>
              <span>등록일</span><span>구분</span><span>상태</span><span>제목</span><span>지역</span><span>종류 · 거래</span><span>금액</span><span>등록자</span><span />
            </PcTHead>
            {(loading || filtered.length === 0) && (
              <PcEmpty>
                <b>{loading ? "불러오는 중..." : tab === "mine" ? "내가 등록한 글이 없어요." : "아직 등록된 글이 없어요."}</b>
                {!loading && tab !== "mine" && <span>첫 글을 등록해보세요.</span>}
              </PcEmpty>
            )}
            {!loading && filtered.map((p) => (
              <PcTRow key={p.id} $cols={PC_COLS} onClick={() => navigate(`/brokerage/${p.id}`)}>
                <span>{timeAgo(p.createdAt)}</span>
                <span style={{ fontWeight: 700 }}>{p.type === "listing" ? "매물공유" : "손님공유"}</span>
                <span style={{ fontWeight: 700, color: p.status === "closed" ? PC.body : PC.primary }}>{p.status === "closed" ? "거래종료" : "진행중"}</span>
                <b>{p.oneLine}</b>
                <span>{p.region}</span>
                <span>{[p.dealType, p.contractType].filter(Boolean).join(" · ") || "-"}</span>
                <b>{p.price || "-"}</b>
                <span>{p.authorCompany}</span>
                <span>
                  {p.authorUid === uid ? (
                    <OutlineBtn onClick={(e) => { e.stopPropagation(); toggleClose(p); }}>{p.status === "closed" ? "다시 열기" : "거래 종료"}</OutlineBtn>
                  ) : (p.type === "listing" || isBroker) ? (
                    <ChatBtn onClick={(e) => { e.stopPropagation(); startChat(p); }}>
                      <IoChatbubbleEllipsesOutline size={15} /> 채팅하기
                    </ChatBtn>
                  ) : (
                    <span style={{ fontSize: 14 }}>공인중개사만 연결</span>
                  )}
                </span>
              </PcTRow>
            ))}
          </PcTable>
          </PcTableWrap>
        ) : (
          <>
        {loading ? (
          <Empty>불러오는 중...</Empty>
        ) : filtered.length === 0 ? (
          <Empty>{tab === "mine" ? "내가 등록한 글이 없어요." : "아직 등록된 글이 없어요. 첫 글을 등록해보세요."}</Empty>
        ) : (
          filtered.map((p) => (
            <Card key={p.id} onClick={() => navigate(`/brokerage/${p.id}`)} style={{ cursor: "pointer" }}>
              <CardTop>
                <TypeTag $listing={p.type === "listing"}>{p.type === "listing" ? "매물공유" : "손님공유"}</TypeTag>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.status === "closed" ? THEME.muted : THEME.primary }}>{p.status === "closed" ? "거래종료" : "진행중"}</span>
                <RegionText><IoLocationOutline size={13} /> {p.region}</RegionText>
                <TimeText>{timeAgo(p.createdAt)}</TimeText>
              </CardTop>
              <OneLine>{p.oneLine}</OneLine>
              <MetaRow>
                {p.dealType && <MetaChip>{p.dealType}</MetaChip>}
                {p.contractType && <MetaChip>{p.contractType}</MetaChip>}
                {p.price && <PriceText>{p.price}</PriceText>}
              </MetaRow>
              <CardFoot>
                <Company>{p.authorCompany}</Company>
                {p.authorUid === uid && (
                  <OutlineBtn onClick={(e) => { e.stopPropagation(); toggleClose(p); }}>{p.status === "closed" ? "다시 열기" : "거래 종료"}</OutlineBtn>
                )}
                {p.authorUid !== uid && (p.type === "listing" || isBroker ? (
                  <ChatBtn onClick={(e) => { e.stopPropagation(); startChat(p); }}>
                    <IoChatbubbleEllipsesOutline size={15} /> 채팅하기
                  </ChatBtn>
                ) : (
                  <span style={{ fontSize: 14, color: THEME.muted }}>공인중개사만 연결</span>
                ))}
              </CardFoot>
            </Card>
          ))
        )}
          </>
        )}

        <Disclaimer>
          본 서비스는 개업공인중개사 상호 간의 소통·정보 교환을 돕는 부가통신 서비스(IT 플랫폼)이며 공인중개사법상 부동산 거래정보망이 아닙니다.
          홈프로는 중개 행위에 개입하거나 거래를 보증하지 않으며, 계약 진행·중개 사고에 대한 책임은 거래 당사자에게 있습니다.
        </Disclaimer>
      </Wrap>

      <Fab onClick={() => (isBroker ? navigate("/brokerage/create") : askRegister())}>
        <IoAddCircle size={20} /> 등록
      </Fab>
    </MainListLayout>
  );
};

export default BrokeragePage;

const Wrap = styled.div` padding: 10px 12px 90px; background: ${THEME.background}; min-height: 100%;
  ${pcOnly`padding: 24px 32px 80px; box-sizing: border-box; word-break: keep-all;`}
`;
const NoticeBar = styled.div`
  padding: 10px 14px; background: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 10px;
  font-size: 13.5px; color: ${THEME.textSecondary}; margin-bottom: 10px; line-height: 1.4;
  ${pcOnly`border-radius: 0; border-color: ${PC.line}; padding: 13px 20px; font-size: 15px; color: ${PC.ink}; margin-bottom: 16px;`}
`;
const TabRow = styled.div`
  display: flex; gap: 8px; margin-bottom: 10px;
  overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  /* PC: 한 박스로 묶인 탭 — 칸 사이 세로선, 열린 칸은 연회색 면 + 굵은 글씨 */
  ${pcOnly`gap: 0; width: 480px; border: 1px solid #d5d9e0; background: #fff; margin-bottom: 16px; overflow: visible;`}
`;
const TabBtn = styled.button`
  flex: 1 0 auto; height: 40px; padding: 0 10px; border-radius: 10px; font-size: 15px; font-weight: ${({ $active }) => ($active ? 600 : 400)};
  white-space: nowrap; line-height: 1; cursor: pointer; font-family: inherit;
  /* 선택된 탭은 테두리 없이 면만 (형 9/17) */
  border: 1px solid ${({ $active }) => ($active ? "transparent" : THEME.border)};
  outline: none;
  background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
  color: ${({ $active }) => ($active ? "#fff" : THEME.text)};
  ${pcOnly`
    flex: 1 1 0; height: 46px; border-radius: 0; border: none; font-size: 16px; color: ${PC.ink};
    background: ${({ $active }) => ($active ? PC.head : "#fff")}; font-weight: ${({ $active }) => ($active ? 700 : 400)};
    & + & { border-left: 1px solid #d5d9e0; }
  `}
`;
const Card = styled.div`
  background: ${THEME.surface}; border-radius: 14px; padding: 16px; margin-bottom: 10px; box-shadow: ${THEME.cardShadow};
`;
const CardTop = styled.div` display: flex; align-items: center; gap: 8px; `;
const TypeTag = styled.span`
  font-size: 14px; font-weight: 700; color: #fff; padding: 2px 10px; border-radius: 6px;
  background: ${({ $listing }) => ($listing ? THEME.primary : THEME.primaryDark)}; /* 보라 칩 (형 9/17) */
`;
const RegionText = styled.span` display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; color: ${THEME.muted}; flex: 1; `;
const TimeText = styled.span` font-size: 14px; color: ${THEME.muted}; `;
const OneLine = styled.div` font-size: 15.5px; font-weight: 700; color: ${THEME.text}; margin-top: 10px; line-height: 1.4; `;
const MetaRow = styled.div` display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; `;
const MetaChip = styled.span` font-size: 14px; color: ${THEME.textSecondary}; background: ${THEME.background}; padding: 3px 9px; border-radius: 12px; `;
const PriceText = styled.span` font-size: 16px; font-weight: 700; color: ${THEME.primary}; margin-left: auto; `;
const DetailText = styled.div` margin-top: 10px; font-size: 13.5px; color: ${THEME.textSecondary}; line-height: 1.55; white-space: pre-wrap; `;
const CardFoot = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid ${THEME.border};
`;
const Company = styled.div` font-size: 15px; font-weight: 600; color: ${THEME.text}; `;
const FilterBox = styled.div` display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;
  /* PC: 한 줄 필터 상자 */
  ${pcOnly`flex-direction: row; flex-wrap: wrap; align-items: flex-end; gap: 14px 16px; margin-bottom: 18px; background: #fff; border: 1px solid ${PC.line}; padding: 16px 20px;`}
`;
// PC 표 — 창이 좁을 때 긴 상호·지역이 옆 칸을 침범하지 않게 칸 안에서 줄바꿈
const PcTableWrap = styled.div` span, b { min-width: 0; overflow-wrap: anywhere; } `;
// 폰에서는 없는 것과 같다(display: contents) — PC 에서만 라벨 + 입력을 한 칸으로 묶는다
const FilterItem = styled.div` display: contents;
  ${pcOnly`display: flex; flex-direction: column; gap: 6px; width: ${({ $w }) => $w}px;`}
`;
const FilterLabel = styled.label` font-size: 14px; font-weight: 700; color: ${PC.ink}; `;
const FilterInput = styled.input`
  height: 42px; border: 1px solid ${THEME.border}; border-radius: 10px; padding: 0 12px; font-size: 15px; font-family: inherit; background: ${THEME.surface};
  &:focus { outline: none; border-color: ${THEME.primary}; }
  ${pcOnly`border-radius: 8px; border-color: ${PC.line}; box-sizing: border-box; width: 100%; color: ${PC.ink};`}
`;
const FilterSelect = styled.select` height: 42px; border: 1px solid ${THEME.border}; border-radius: 10px; padding: 0 10px; font-size: 15px; font-family: inherit; background: ${THEME.surface};
  ${pcOnly`border-radius: 8px; border-color: ${PC.line}; width: 100%; color: ${PC.ink};`}
`;
const FilterChips = styled.div` display: flex; gap: 6px; `;
const FilterChip = styled.button`
  flex: 1; height: 36px; border-radius: 10px; font-size: 14px; font-family: inherit; cursor: pointer;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? `${THEME.primary}15` : THEME.surface)}; color: ${({ $active }) => ($active ? THEME.primaryDark : THEME.text)}; font-weight: ${({ $active }) => ($active ? 700 : 400)};
  &:focus { outline: none; }
  ${pcOnly`height: 42px; border-radius: 8px; font-size: 15px;`}
`;
const SheetOverlay = styled.div` position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; `;
const Sheet = styled.div` width: 100%; max-width: var(--app-max, 400px); max-height: 84vh; overflow-y: auto; background: #fff; border-radius: 16px 16px 0 0; padding: 10px 18px 28px; `;
const SheetHandle = styled.div` width: 40px; height: 4px; border-radius: 2px; background: #D1D5DB; margin: 0 auto 12px; `;
const SheetHead = styled.div` display: flex; align-items: center; gap: 8px; margin-bottom: 8px; `;
const SheetClose = styled.button` background: none; border: none; font-size: 15px; font-weight: 700; color: ${THEME.muted}; cursor: pointer; font-family: inherit; `;
const SheetTitle = styled.div` font-size: 18px; font-weight: 700; color: ${THEME.text}; margin-bottom: 10px; word-break: keep-all; `;
const SheetRow = styled.div` display: flex; justify-content: space-between; gap: 12px; font-size: 15px; padding: 6px 0; border-bottom: 1px solid ${THEME.border}; span { color: ${THEME.muted}; flex: none; } b { font-weight: 600; text-align: right; } `;
const SheetDetail = styled.div` font-size: 15px; line-height: 1.6; color: ${THEME.text}; padding: 12px 0 4px; white-space: pre-wrap; word-break: keep-all; `;
const SheetActions = styled.div` display: flex; gap: 8px; margin-top: 14px; `;
const SheetNote = styled.div` font-size: 14px; line-height: 1.55; color: ${THEME.muted}; margin-top: 12px; word-break: keep-all; `;
const OutlineBtn = styled.button`
  display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 14px; border-radius: 8px;
  border: 1px solid ${THEME.border}; background: ${THEME.surface}; color: ${THEME.text}; font-size: 15px; font-weight: 600;
  cursor: pointer; font-family: inherit; &:active { background: #F3F4F6; }
`;
const ChatBtn = styled.button`
  display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 14px; border-radius: 8px;
  border: 1px solid ${THEME.primary}; background: ${THEME.primary}; color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; font-family: inherit; &:active { opacity: 0.85; }
`;
const Empty = styled.div` padding: 60px 20px; text-align: center; font-size: 16px; color: ${THEME.muted}; `;
const Disclaimer = styled.div` margin-top: 14px; font-size: 13px; color: ${THEME.muted}; line-height: 1.6;
  ${pcOnly`color: ${PC.body}; margin-top: 16px;`}
`;
const Fab = styled.button`
  position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%); z-index: 50;
  display: inline-flex; align-items: center; gap: 6px; height: 46px; padding: 0 22px; border-radius: 24px;
  border: none; background: ${THEME.button}; color: #fff; font-size: 17px; font-weight: 600; cursor: pointer;
  font-family: inherit; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  /* PC: 떠 있는 버튼 대신 제목 줄(위 52px 줄) 오른쪽 버튼 */
  ${pcOnly`top: 6px; bottom: auto; left: auto; right: 24px; transform: none; z-index: 1000; height: 40px; padding: 0 18px; border-radius: 10px; font-size: 16px; font-weight: 700; box-shadow: none; background: ${PC.primary};`}
`;
