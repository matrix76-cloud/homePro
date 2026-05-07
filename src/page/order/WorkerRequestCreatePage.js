/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";

/* ─── 작업 카테고리 (시트6 사양) ─── */
const WORK_CATEGORIES = {
  "작업내용": ["이사청소", "입주청소", "준공청소", "특수청소", "화재청소", "공장청소", "창고청소", "가전청소", "기타청소"],
  "전문작업": ["금속샤시", "데코타일", "벽돌줄눈", "위생설비", "자재양중", "타일메지", "인테리어필름", "도배공", "장판공", "마루공", "방수공", "용접공", "전기공", "철거공", "목공", "조적공", "타일공", "덕트공", "도장공", "미장공", "유리.실리콘"],
  "작업인력": ["보통인부", "기술자보조", "농촌작업", "행사작업", "스페어기사"],
  "장비/특수": ["굴삭기", "스카이차", "크레인", "지게차", "덤프트럭"],
};

const WORK_DATE_OPTIONS = ["긴급", "오늘", "내일", "날짜지정"];
const WORK_TIME_OPTIONS = ["하루 08:00~17:00", "오전 08:00~12:00", "오후 13:00~17:00", "저녁 18:00~21:00", "시간무관", "시간 설정"];

const WorkerRequestCreatePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [selectedCat, setSelectedCat] = useState(null);
  const [detail, setDetail] = useState("");
  const [siteDetail, setSiteDetail] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [pickupAddr, setPickupAddr] = useState("");
  const [siteAddr, setSiteAddr] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [workDatePicker, setWorkDatePicker] = useState("");
  const [workTime, setWorkTime] = useState("");
  const [customTimeStart, setCustomTimeStart] = useState("");
  const [customTimeEnd, setCustomTimeEnd] = useState("");
  const [wage, setWage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const handleSubmit = async () => {
    if (!selectedCat) return showToast("작업 카테고리를 선택해주세요");
    if (!detail.trim()) return showToast("작업내용을 입력해주세요");
    if (!siteAddr.trim()) return showToast("작업주소를 입력해주세요");
    setSubmitting(true);
    try {
      await addDoc(collection(db, "homepro_worker_requests"), {
        category: selectedCat,
        detail: detail.trim(),
        siteDetail: siteDetail.trim() || null,
        headcount: headcount ? Number(headcount) : null,
        pickupAddr: pickupAddr.trim() || null,
        siteAddr: siteAddr.trim(),
        workDate: workDate || null,
        workDatePicker: workDate === "날짜지정" ? workDatePicker : null,
        workTime: workTime === "시간 설정"
          ? { start: customTimeStart, end: customTimeEnd }
          : workTime || null,
        wage: wage ? Number(wage) : null,
        createdBy: userData?.uid || null,
        writer: userData?.nickname || userData?.name || "",
        status: "접수",
        createdAt: serverTimestamp(),
      });
      showToast("등록되었습니다");
      setTimeout(() => navigate(-1), 600);
    } catch (e) {
      console.error(e);
      showToast("등록 실패: " + (e.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleBackLayout NAME="작업자 요청 등록" hideFooter>
      <PageWrap>
        {/* 면책문구 */}
        <DisclaimerBox>
          <strong>플랫폼 면책 안내</strong>
          홈프로는 작업 인력 연결을 위한 중개 서비스만 제공하며, 실제 작업 계약·작업 대금지급·작업 안전 및 사고 책임은 작업 요청자와 작업자 간에 이루어집니다.
        </DisclaimerBox>

        {/* 카테고리 선택 */}
        <Section>
          <Label>작업 카테고리</Label>
          {Object.entries(WORK_CATEGORIES).map(([group, items]) => (
            <CatGroup key={group}>
              <CatGroupLabel>{group}</CatGroupLabel>
              <ChipRow>
                {items.map((item) => (
                  <Chip
                    key={item}
                    $active={selectedCat === item}
                    type="button"
                    onClick={() => setSelectedCat(item)}
                  >
                    {item}
                  </Chip>
                ))}
              </ChipRow>
            </CatGroup>
          ))}
        </Section>

        {/* 작업 내용 */}
        <Section>
          <Label>작업내용 및 안내사항</Label>
          <Textarea
            placeholder="현장 상세설명 및 기타 요청사항"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={4}
          />
          <SubLabel style={{ marginTop: 12 }}>현장 상세설명 (선택)</SubLabel>
          <Textarea
            placeholder="추가 안내사항이 있다면 입력"
            value={siteDetail}
            onChange={(e) => setSiteDetail(e.target.value)}
            rows={3}
          />
        </Section>

        {/* 필요 인원 */}
        <Section>
          <Label>필요 인원</Label>
          <Input
            type="number"
            placeholder="예: 3"
            value={headcount}
            onChange={(e) => setHeadcount(e.target.value)}
          />
        </Section>

        {/* 작업 주소 */}
        <Section>
          <Label>작업 주소</Label>
          <SubLabel>픽업위치 (선택)</SubLabel>
          <Input
            placeholder="픽업할 주소"
            value={pickupAddr}
            onChange={(e) => setPickupAddr(e.target.value)}
          />
          <SubLabel style={{ marginTop: 10 }}>작업위치</SubLabel>
          <Input
            placeholder="작업할 주소"
            value={siteAddr}
            onChange={(e) => setSiteAddr(e.target.value)}
          />
        </Section>

        {/* 작업 날짜 */}
        <Section>
          <Label>작업 날짜</Label>
          <ChipRow>
            {WORK_DATE_OPTIONS.map((o) => (
              <Chip key={o} $active={workDate === o} type="button" onClick={() => setWorkDate(o)}>
                {o}
              </Chip>
            ))}
          </ChipRow>
          {workDate === "날짜지정" && (
            <Input
              style={{ marginTop: 10 }}
              type="date"
              value={workDatePicker}
              onChange={(e) => setWorkDatePicker(e.target.value)}
            />
          )}
        </Section>

        {/* 작업 시간 */}
        <Section>
          <Label>작업 시간</Label>
          <ChipRow>
            {WORK_TIME_OPTIONS.map((o) => (
              <Chip key={o} $active={workTime === o} type="button" onClick={() => setWorkTime(o)}>
                {o}
              </Chip>
            ))}
          </ChipRow>
          {workTime === "시간 설정" && (
            <RowGroup style={{ marginTop: 10 }}>
              <Input type="time" value={customTimeStart} onChange={(e) => setCustomTimeStart(e.target.value)} />
              <Input type="time" value={customTimeEnd} onChange={(e) => setCustomTimeEnd(e.target.value)} />
            </RowGroup>
          )}
        </Section>

        {/* 인건비 */}
        <Section>
          <Label>인건비</Label>
          <RowGroup>
            <Input
              type="number"
              placeholder="금액"
              value={wage}
              onChange={(e) => setWage(e.target.value)}
            />
            <Unit>원</Unit>
          </RowGroup>
        </Section>

        <SubmitBtn onClick={handleSubmit} disabled={submitting}>
          {submitting ? "접수 중..." : "접수하기"}
        </SubmitBtn>
        <BottomSpacer />
      </PageWrap>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default WorkerRequestCreatePage;

/* ===================== styles ===================== */
const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  background: ${THEME.background};
  min-height: 100%;
`;

const DisclaimerBox = styled.div`
  margin: 8px 12px;
  padding: 12px 14px;
  background: #FEF3C7;
  border-radius: 10px;
  font-size: 12px;
  color: #92400E;
  line-height: 1.5;
  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
    color: #78350F;
  }
`;

const Section = styled.div`
  background: #fff;
  margin: 8px 12px;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const Label = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 10px;
`;

const SubLabel = styled.div`
  font-size: 12px;
  color: ${THEME.muted};
  margin-bottom: 6px;
`;

const CatGroup = styled.div`
  margin-bottom: 12px;
`;

const CatGroupLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.muted};
  margin-bottom: 6px;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Chip = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  border-radius: 16px;
  background: ${({ $active }) => ($active ? THEME.primary : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: #fff;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;

const RowGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Unit = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  flex-shrink: 0;
`;

const SubmitBtn = styled.button`
  margin: 16px 12px 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: ${({ disabled }) => (disabled ? THEME.muted : THEME.primary)};
  border: none;
  border-radius: 10px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;

const BottomSpacer = styled.div`
  height: 40px;
`;

const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 13px;
  border-radius: 20px;
  z-index: 1000;
`;
