/**
 * 도급업자 배상책임보험 셀프보장등록 — /order/self-cover (대표 리뷰 11/02)
 *  앱 밖에서 수주한 일을 간단히 등재해 보험 보장 · 현장기록을 쓰는 오더.
 *  대표 "1.시공 카테고리 선택 2.현장 상세 주소(시/군/구 및 상세 주소) 3.공사 기간(시작일 및 종료일)
 *        4.발주처: 발주처 상호 또는 현장(공사)명 또는 개요 타이틀"
 *  항목이 네 개뿐이라 한 화면. 저장 꼴은 예약접수(OrderCreatePage)의 셀프 오더(selfOrder) payload 와 같다 —
 *  등록자 본인이 홈프로(matchedProUid), 바로 배정, 소개수수료 · 매칭 없음.
 */
import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { serverTimestamp } from "firebase/firestore";
import { IoShieldCheckmarkOutline } from "react-icons/io5";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { createOrder } from "../../service/OrderService";
import { pcOnly } from "../../pc/pcKit";

const ymdLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const SelfCoverRegisterPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData, currentUser, loading } = useAuth();

  const [categoryId, setCategoryId] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [region, setRegion] = useState(null); // { sido, sigungu } — 주소 검색 결과에서
  const [startDate, setStartDate] = useState(ymdLocal(new Date()));
  const [endDate, setEndDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [memo, setMemo] = useState("");
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const addressEmbedRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [toast, setToast] = useState("");
  const showToast = useCallback((msg, ms = 2000) => { setToast(msg); setTimeout(() => setToast(""), ms); }, []);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const myUid = user?.uid || userData?.uid || "";

  // 로그인 안 했으면 로그인 화면으로
  useEffect(() => {
    if (loading) return;
    if (!currentUser && !user?.uid) navigate("/MobileLogin", { replace: true });
  }, [loading, currentUser, user?.uid, navigate]);

  // Daum 주소 API — 예약접수와 같은 방식(검색 → 도로명/지번 + 상세주소)
  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
  const openDaumPostcode = () => {
    if (!window.daum?.Postcode) { alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요."); return; }
    setShowAddressSearch(true);
  };
  useEffect(() => {
    if (!showAddressSearch || !addressEmbedRef.current || !window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        setAddress(addr);
        setAddressDetail("");
        setRegion({ sido: data.sido || "", sigungu: data.sigungu || "" });
        setShowAddressSearch(false);
      },
      width: "100%",
      height: "100%",
    }).embed(addressEmbedRef.current);
  }, [showAddressSearch]);

  const validate = () => {
    if (!categoryId) { showToast("시공 카테고리를 선택해주세요"); return false; }
    if (!address.trim()) { showToast("현장 주소를 검색해주세요"); return false; }
    if (!startDate) { showToast("공사 시작일을 선택해주세요"); return false; }
    if (!endDate) { showToast("공사 종료일을 선택해주세요"); return false; }
    if (endDate < startDate) { showToast("종료일은 시작일과 같거나 뒤여야 합니다"); return false; }
    if (!clientName.trim()) { showToast("발주처 또는 현장명을 입력해주세요"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!myUid) { navigate("/MobileLogin"); return; }
    if (userData?.orderBlocked) {
      alert("블랙리스트 신고 확인 결과, 관리자에 의해 오더 작성 권한이 차단된 계정입니다.\n문의는 고객센터를 이용해주세요.");
      return;
    }
    if (!validate()) return;
    if (!window.confirm("셀프보장등록으로 등재하시겠습니까?")) return;
    submittingRef.current = true;
    setSubmitting(true);
    let keep = false;
    try {
      const nickname = userData?.nickname || userData?.name || user?.USERINFO?.nickname || "익명";
      const writerPhoto = userData?.profileImage || userData?.photoURL || user?.USERINFO?.userimg || "";
      const title = clientName.trim();
      const period = `${startDate} ~ ${endDate}`;
      // OrderCreatePage 의 orderPayload + selfOrder 덮어쓰기와 같은 꼴 — 이 폼에 없는 칸은 null / 빈값
      const orderPayload = {
        categoryId,
        categoryName: category?.shortName || "",
        subcategories: [],
        subcategory: "",
        title,
        description: memo.trim() ? `${title}\n공사 기간 ${period}\n${memo.trim()}` : `${title}\n공사 기간 ${period}`,
        spaceType: "",
        buildingType: "",
        options: [],
        optionEtc: null,
        areaValue: "",
        spaceFields: null,
        attrs: null,
        inputs: null,
        itemQty: null,
        customInput: null,
        schedule: startDate,
        address,
        priceType: "",
        directPrice: "",
        price: "시공금액",
        createdBy: myUid,
        writer: nickname,
        writerPhoto,
        location: addressDetail.trim() ? `${address} ${addressDetail.trim()}` : address,
        addressDetail: addressDetail.trim() || null,
        region: region || null, // 시/도 · 시/군/구 (주소 검색 결과)
        photos: [],
        // B2B 공통 필드
        workDate: "예약날짜",
        workDatePicker: startDate,
        workPeriod: { start: startDate, end: endDate }, // 공사 기간 (셀프보장등록)
        workTime: null,
        contactPhone: userData?.phoneE164 || null,
        customerPhone: null,
        payMode: null,
        paymentMethod: null,
        infoReward: null,
        contractBonus: null,
        infoIncentive: null,
        wagePay: null,
        b2bPriceType: "fixed",
        b2bPriceAmount: 0,
        // 발주처 상호 · 현장(공사)명 · 개요
        clientName: title,
        memo: memo.trim() || null,
        // 셀프 등록 오더: 등록자 본인이 홈프로, 바로 배정, 소개수수료 · 매칭 없음
        selfOrder: true,
        selfCoverSimple: true, // 간단 폼(/order/self-cover)으로 등재한 것
        matchedProUid: myUid,
        orderStatus: "배정",
        assignedAt: serverTimestamp(),
        referralFee: null,
        referralPayMethod: null,
        matchType: null,
        directPhone: null,
        insurancePreferred: true,
        insuranceRequired: false,
      };
      const id = await createOrder(orderPayload);
      keep = true;
      showToast("등재되었습니다 — 작업 전 현장 체크인과 사진 등록을 해 주세요", 2600);
      setTimeout(() => navigate(`/order/detail/${id}`, { replace: true }), 1600);
    } catch (err) {
      console.error("셀프보장등록 실패:", err);
      alert("등재에 실패했습니다. 다시 시도해주세요.");
    } finally {
      if (!keep) { submittingRef.current = false; setSubmitting(false); }
    }
  };

  return (
    <SimpleBackLayout NAME="셀프보장등록">
      <Wrap>
        <Intro>
          <IoShieldCheckmarkOutline size={26} color={THEME.primary} style={{ flexShrink: 0 }} />
          <IntroText>
            <IntroTitle>도급업자 배상책임보험 셀프보장등록</IntroTitle>
            <IntroDesc>앱 밖에서 수주한 일을 등재하면 보험 보장 · 현장기록(체크인 · 사진)을 쓸 수 있습니다. 등재한 일은 내 오더(배정)로 들어가고 다른 홈프로에게는 보이지 않습니다.</IntroDesc>
          </IntroText>
        </Intro>

        {/* 1. 시공 카테고리 */}
        <Block>
          <Label>시공 카테고리</Label>
          {category ? (
            <PickedRow type="button" onClick={() => setCategoryId("")}>
              <PickedText>{category.name}</PickedText>
              <PickedEdit>수정</PickedEdit>
            </PickedRow>
          ) : (
            <CatCellGrid>
              {CATEGORIES.filter((c) => !c.proOnly).map((c) => (
                <CatCell key={c.id} type="button" onClick={() => setCategoryId(c.id)}>{c.name}</CatCell>
              ))}
            </CatCellGrid>
          )}
        </Block>

        {/* 2. 현장 주소 */}
        <Block>
          <Label>현장 주소</Label>
          <AddressRow onClick={openDaumPostcode}>
            <AddressText $hasValue={!!address}>{address || "시/군/구 · 도로명으로 주소를 검색하세요"}</AddressText>
            <AddressBtn type="button">검색</AddressBtn>
          </AddressRow>
          {address && (
            <Input style={{ marginTop: 8 }} placeholder="상세주소 입력 (동/호수 등)" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
          )}
        </Block>

        {/* 3. 공사 기간 */}
        <Block>
          <Label>공사 기간</Label>
          <DateRow>
            <DateField>
              <SubLabel>시작일</SubLabel>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); }} />
            </DateField>
            <DateField>
              <SubLabel>종료일</SubLabel>
              <Input type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </DateField>
          </DateRow>
        </Block>

        {/* 4. 발주처 */}
        <Block>
          <Label>발주처</Label>
          <SubLabel>발주처 상호 또는 현장(공사)명 · 개요</SubLabel>
          <Input placeholder="예: 종로구 00아파트 도배 현장, 강남 상가 인테리어" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={80} />
        </Block>

        <Block>
          <Label>메모 <LabelSub>(선택)</LabelSub></Label>
          <TextArea placeholder="공사 범위 · 특이사항 등" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Block>

        <BottomBar>
          <SubmitButton type="button" disabled={submitting} onClick={handleSubmit}>{submitting ? "등재 중..." : "등재하기"}</SubmitButton>
        </BottomBar>
      </Wrap>

      {showAddressSearch && (
        <AddressModalOverlay onClick={() => setShowAddressSearch(false)}>
          <AddressModalBox onClick={(e) => e.stopPropagation()}>
            <AddressModalHeader>
              <AddressModalTitle>주소 검색</AddressModalTitle>
              <AddressCloseBtn type="button" onClick={() => setShowAddressSearch(false)}>닫기</AddressCloseBtn>
            </AddressModalHeader>
            <AddressEmbedWrap ref={addressEmbedRef} />
          </AddressModalBox>
        </AddressModalOverlay>
      )}
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default SelfCoverRegisterPage;

/* ── 스타일 — OrderCreatePage 의 조각과 같은 값 ── */
const Wrap = styled.div`
  padding: 16px 16px 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  ${pcOnly`max-width: 860px; margin: 0 auto; padding: 24px 24px 0;`}
`;
const Intro = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 10px;
`;
const IntroText = styled.div` flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; word-break: keep-all; `;
const IntroTitle = styled.div` font-size: 16px; font-weight: 600; color: ${THEME.text}; line-height: 1.35; `;
const IntroDesc = styled.div` font-size: 14px; color: ${THEME.text}; line-height: 1.5; `;
const Block = styled.div` margin-top: 22px; `;
const Label = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;
const LabelSub = styled.span` font-size: 14px; font-weight: 400; `;
const SubLabel = styled.div` font-size: 14px; color: ${THEME.text}; margin-bottom: 6px; `;
const CatCellGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  ${pcOnly`grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px;`}
`;
const CatCell = styled.button`
  min-height: 62px;
  padding: 14px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  word-break: keep-all;
  line-height: 1.35;
  border-radius: 10px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
  &:focus { outline: none; }
`;
const PickedRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 13px 14px;
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  &:focus { outline: none; }
`;
const PickedText = styled.span` font-size: 15px; font-weight: 700; color: ${THEME.text}; `;
const PickedEdit = styled.span` font-size: 14px; color: ${THEME.primary}; flex-shrink: 0; `;
const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  cursor: pointer;
  background: ${THEME.surface};
`;
const AddressText = styled.div`
  flex: 1;
  font-size: 16px;
  word-break: keep-all;
  color: ${({ $hasValue }) => ($hasValue ? THEME.text : THEME.muted)};
`;
const AddressBtn = styled.button`
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid ${THEME.primary};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.primary};
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
`;
const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  height: 48px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-family: inherit;
  background: ${THEME.surface};
  color: ${THEME.text};
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;
const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;
const DateRow = styled.div` display: flex; gap: 10px; `;
const DateField = styled.div` flex: 1; min-width: 0; `;
/* 맨 아래 붙는 버튼 줄 — 본문 스크롤 단 안에서 바닥에 붙는다(sticky) */
const BottomBar = styled.div`
  position: sticky;
  bottom: 0;
  margin: 26px -16px 0;
  padding: 12px 16px 16px;
  background: #F7F8FA;
  border-top: 1px solid ${THEME.border};
  margin-top: auto;
  /* PC 는 본문 스크롤 단이 달라 sticky 가 화면 가운데에 걸린다 — 내용 끝에 그냥 둔다 */
  ${pcOnly`position: static; margin: 30px 0 40px; padding: 0; background: none; border-top: none;`}
`;
const SubmitButton = styled.button`
  width: 100%;
  padding: 16px;
  background: ${THEME.button};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  &:active { background: ${THEME.buttonDark}; }
  &:disabled { background: #ccc; }
`;
const AddressModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;
const AddressModalBox = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;
const AddressModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${THEME.border};
`;
const AddressModalTitle = styled.div` font-size: 18px; font-weight: 600; color: ${THEME.text}; `;
const AddressCloseBtn = styled.button`
  border: 1px solid ${THEME.border};
  background: #fff;
  font-size: 15px;
  color: ${THEME.text};
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-family: inherit;
`;
const AddressEmbedWrap = styled.div` flex: 1; width: 100%; `;
const Toast = styled.div`
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 40px);
  padding: 12px 20px;
  background: #333;
  color: #fff;
  font-size: 15px;
  line-height: 1.45;
  text-align: center;
  word-break: keep-all;
  border-radius: 10px;
  z-index: 9999;
`;
