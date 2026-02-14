/* eslint-disable */
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { IoCloseOutline } from "react-icons/io5";

const pad = (n) => String(n).padStart(2, "0");
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const formatDate = (y, m, d) => {
  const dt = new Date(y, m - 1, d);
  return `${y}.${pad(m)}.${pad(d)} (${DAYS[dt.getDay()]})`;
};

const HOURS = [];
for (let h = 0; h < 24; h++) {
  const period = h < 12 ? "오전" : "오후";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  HOURS.push({ value: h, label: `${period} ${display}시` });
}

const ScheduleCreatePage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const initDate = state?.date || {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  };

  const [title, setTitle] = useState("");
  const [startDate] = useState(formatDate(initDate.year, initDate.month, initDate.day));
  const [startHour, setStartHour] = useState(5);
  const [endDate] = useState(formatDate(initDate.year, initDate.month, initDate.day));
  const [endHour, setEndHour] = useState(6);
  const [location, setLocationValue] = useState("");
  const [alarmOn, setAlarmOn] = useState(true);
  const [memo, setMemo] = useState("");

  const handleClose = () => navigate(-1);

  const handleComplete = () => {
    // TODO: 실제 저장 로직
    navigate(-1);
  };

  return (
    <PageWrap>
      {/* 헤더 */}
      <Header>
        <HeaderTitle>일정 등록</HeaderTitle>
        <CloseBtn onClick={handleClose}>
          <IoCloseOutline size={28} color={THEME.text} />
        </CloseBtn>
      </Header>

      <FormScroll>
        {/* 제목 */}
        <Section>
          <Label>제목</Label>
          <Input
            placeholder="제목을 입력하세요."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Section>

        {/* 시작 */}
        <Section>
          <Label>시작</Label>
          <RowPicker>
            <SelectBox>
              <SelectText>{startDate}</SelectText>
              <Chevron>&#9662;</Chevron>
            </SelectBox>
            <SelectBox>
              <Select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
              >
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </Select>
            </SelectBox>
          </RowPicker>
        </Section>

        {/* 종료 */}
        <Section>
          <Label>종료</Label>
          <RowPicker>
            <SelectBox>
              <SelectText>{endDate}</SelectText>
              <Chevron>&#9662;</Chevron>
            </SelectBox>
            <SelectBox>
              <Select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
              >
                {HOURS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </Select>
            </SelectBox>
          </RowPicker>
        </Section>

        <Divider />

        {/* 장소 */}
        <Section>
          <Label>장소</Label>
          <Input
            placeholder="예) 강남구 테헤란로"
            value={location}
            onChange={(e) => setLocationValue(e.target.value)}
          />
        </Section>

        {/* 알림 */}
        <AlarmRow>
          <Label style={{ marginBottom: 0 }}>알림</Label>
          <ToggleWrap $on={alarmOn} onClick={() => setAlarmOn(!alarmOn)}>
            <ToggleKnob $on={alarmOn} />
          </ToggleWrap>
        </AlarmRow>

        {alarmOn && (
          <InfoBox>
            <InfoIcon>ℹ</InfoIcon>
            <InfoText>
              서비스 시작 10분 전, 1시간 전, 하루 전에{"\n"}고객/고수 모두에게 알림을 보내드려요.
            </InfoText>
          </InfoBox>
        )}

        <Divider />

        {/* 비용/메모 */}
        <Section>
          <Label>메모</Label>
          <TextArea
            placeholder="메모를 입력하세요."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
          />
        </Section>

        <BottomSpacer />
      </FormScroll>

      {/* 완료 버튼 */}
      <FixedBottom>
        <CompleteBtn onClick={handleComplete} disabled={!title.trim()}>
          완료
        </CompleteBtn>
      </FixedBottom>
    </PageWrap>
  );
};

export default ScheduleCreatePage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${THEME.surface};
`;

const Header = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const HeaderTitle = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${THEME.text};
`;

const CloseBtn = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  &:active { opacity: 0.5; }
`;

const FormScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24px 20px;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
  margin-bottom: 10px;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  resize: none;
  font-family: inherit;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;

const RowPicker = styled.div`
  display: flex;
  gap: 10px;
`;

const SelectBox = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
`;

const SelectText = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
  flex: 1;
`;

const Chevron = styled.span`
  font-size: 12px;
  color: ${THEME.muted};
  margin-left: 4px;
`;

const Select = styled.select`
  width: 100%;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
`;

const Divider = styled.div`
  height: 1px;
  background: ${THEME.border};
  margin: 4px 0 24px;
`;

const AlarmRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const ToggleWrap = styled.div`
  width: 50px;
  height: 28px;
  border-radius: 14px;
  background: ${({ $on }) => $on ? THEME.purple : THEME.border};
  display: flex;
  align-items: center;
  padding: 2px;
  cursor: pointer;
  transition: background 0.2s;
`;

const ToggleKnob = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transform: translateX(${({ $on }) => $on ? "22px" : "0px"});
  transition: transform 0.2s;
`;

const InfoBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  background: ${THEME.background};
  border-radius: 12px;
  margin-bottom: 24px;
`;

const InfoIcon = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${THEME.muted};
  color: #fff;
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const InfoText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.5;
  white-space: pre-line;
`;

const BottomSpacer = styled.div`
  height: 80px;
`;

const FixedBottom = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0;
  z-index: 900;
`;

const CompleteBtn = styled.button`
  width: 100%;
  height: 56px;
  border: none;
  background: ${({ disabled }) => disabled ? THEME.border : THEME.purple};
  color: #fff;
  font-size: 17px;
  font-weight: 400;
  cursor: ${({ disabled }) => disabled ? "default" : "pointer"};
  &:active {
    background: ${({ disabled }) => disabled ? THEME.border : THEME.primaryDark};
  }
`;
