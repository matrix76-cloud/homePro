/* eslint-disable */
import React, { useState, useMemo, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { IoCloseOutline, IoChevronBack, IoChevronForward } from "react-icons/io5";
import usePcWide from "../../hooks/usePcWide";

const pad = (n) => String(n).padStart(2, "0");
const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const toKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const HOURS = [];
for (let h = 0; h < 24; h++) {
  const period = h < 12 ? "오전" : "오후";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  HOURS.push({ value: h, label: `${period} ${display}시` });
}

const ScheduleCreatePage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide();
  const { state } = useLocation();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const initDate = state?.date || {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  };

  const [calYear, setCalYear] = useState(initDate.year);
  const [calMonth, setCalMonth] = useState(initDate.month - 1);

  const initKey = toKey(initDate.year, initDate.month, initDate.day);
  const [startDate, setStartDate] = useState(initKey);
  const [endDate, setEndDate] = useState(initKey);
  const [selectStep, setSelectStep] = useState("done"); // "start" | "end" | "done"

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [schedList, setSchedList] = useState([]);

  const handleClose = () => navigate(-1);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const rows = [];
    let row = [];
    for (let i = 0; i < firstDay; i++) row.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      row.push(d);
      if (row.length === 7) { rows.push(row); row = []; }
    }
    if (row.length > 0) { while (row.length < 7) row.push(null); rows.push(row); }
    return rows;
  }, [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
  };

  const handleDateClick = (day) => {
    if (!day) return;
    const key = toKey(calYear, calMonth + 1, day);
    if (selectStep === "done" || selectStep === "start") {
      setStartDate(key);
      setEndDate(key);
      setSelectStep("end");
    } else {
      if (key < startDate) {
        setStartDate(key);
      } else {
        setEndDate(key);
      }
      setSelectStep("done");
    }
  };

  const isInRange = (day) => {
    if (!day) return false;
    const key = toKey(calYear, calMonth + 1, day);
    return key >= startDate && key <= endDate;
  };
  const isStart = (day) => day && toKey(calYear, calMonth + 1, day) === startDate;
  const isEnd = (day) => day && toKey(calYear, calMonth + 1, day) === endDate;
  const isSameDay = startDate === endDate;

  const formatRange = () => {
    const [, sm, sd] = startDate.split("-");
    const [, em, ed] = endDate.split("-");
    const sDt = new Date(startDate);
    const eDt = new Date(endDate);
    const sDay = WEEK_DAYS[sDt.getDay()];
    const eDay = WEEK_DAYS[eDt.getDay()];
    if (isSameDay) return `${Number(sm)}/${Number(sd)} (${sDay})`;
    return `${Number(sm)}/${Number(sd)} (${sDay}) ~ ${Number(em)}/${Number(ed)} (${eDay})`;
  };

  const getDatesInRange = (s, e) => {
    const dates = [];
    const cur = new Date(s);
    const end = new Date(e);
    while (cur <= end) {
      dates.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const handleAddToList = () => {
    if (!title.trim() || !startDate) return;
    setSchedList((prev) => [...prev, { title: title.trim(), startDate, endDate }]);
    setTitle("");
    setStartDate(null);
    setEndDate(null);
    setSelectStep("done");
  };

  const removeFromList = (idx) => {
    setSchedList((prev) => prev.filter((_, i) => i !== idx));
  };

  const allItems = [...schedList, ...(title.trim() && startDate ? [{ title: title.trim(), startDate, endDate }] : [])];

  const handleComplete = async () => {
    if (allItems.length === 0 || !uid || saving) return;
    setSaving(true);
    try {
      for (const item of allItems) {
        const single = item.startDate === item.endDate;
        const groupId = single ? null : `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const dates = getDatesInRange(item.startDate, item.endDate);
        for (const dateStr of dates) {
          await addDoc(collection(db, "homepro_schedules"), {
            uid,
            title: item.title,
            date: dateStr,
            ...(groupId && { groupId }),
            createdAt: serverTimestamp(),
          });
        }
      }
      navigate(-1);
    } catch (e) {
      console.error("일정 저장 실패:", e);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const fmtItem = (it) => {
    const f = (k) => { const d = new Date(k); return `${d.getMonth() + 1}/${d.getDate()} (${WEEK_DAYS[d.getDay()]})`; };
    return it.startDate === it.endDate ? f(it.startDate) : `${f(it.startDate)} ~ ${f(it.endDate)}`;
  };

  // 조각 — 폰·PC 가 같이 쓴다
  const calEl = (
        <CalSection>
          <CalNav>
            <CalNavBtn onClick={prevMonth}><IoChevronBack size={18} /></CalNavBtn>
            <CalTitle>{calYear}년 {calMonth + 1}월</CalTitle>
            <CalNavBtn onClick={nextMonth}><IoChevronForward size={18} /></CalNavBtn>
          </CalNav>
          <CalDayHeader>
            {WEEK_DAYS.map((d, i) => (
              <CalDayLabel key={d} $sun={i === 0} $sat={i === 6}>{d}</CalDayLabel>
            ))}
          </CalDayHeader>
          {calendarDays.map((row, ri) => {
            // 주별 바 계산
            const weekDates = row.map((d) => d ? toKey(calYear, calMonth + 1, d) : null);
            const ws = weekDates.find((x) => x);
            const we = [...weekDates].reverse().find((x) => x);
            const bars = (ws && we) ? schedList
              .filter((b) => b.startDate <= we && b.endDate >= ws)
              .map((b) => {
                const sc = weekDates.findIndex((x) => x && x >= b.startDate);
                const ec = 6 - [...weekDates].reverse().findIndex((x) => x && x <= b.endDate);
                return { ...b, col: Math.max(0, sc) + 1, colEnd: Math.min(7, ec) + 2 };
              }) : [];
            const barRows = [];
            const lanes = [];
            bars.forEach((bar) => {
              let lane = lanes.findIndex((l) => l <= bar.col);
              if (lane === -1) lane = lanes.length;
              lanes[lane] = bar.colEnd;
              if (!barRows[lane]) barRows[lane] = [];
              barRows[lane].push(bar);
            });
            return (
              <React.Fragment key={ri}>
                <CalRow>
                  {row.map((day, ci) => (
                    <CalCell key={ci} onClick={() => handleDateClick(day)} $empty={!day}>
                      {day && (
                        <CalDateWrap
                          $inRange={isInRange(day)}
                          $isStart={isStart(day)}
                          $isEnd={isEnd(day)}
                          $isSame={isSameDay && isStart(day)}
                        >
                          <CalNum
                            $selected={isStart(day) || isEnd(day)}
                            $sun={ci === 0} $sat={ci === 6}
                          >
                            {day}
                          </CalNum>
                        </CalDateWrap>
                      )}
                    </CalCell>
                  ))}
                </CalRow>
                {barRows.map((bRow, bri) => (
                  <BarRow key={bri}>
                    {bRow.map((bar, bi) => (
                      <Bar key={bi} $col={bar.col} $colEnd={bar.colEnd}
                        onClick={() => removeFromList(schedList.indexOf(bar))}>
                        {bar.title}
                      </Bar>
                    ))}
                  </BarRow>
                ))}
              </React.Fragment>
            );
          })}
          <CalHint>
            {selectStep === "end" ? "종료일을 선택하세요" : pcWide ? "날짜를 눌러 기간 선택" : "날짜를 터치하여 기간 선택"}
          </CalHint>
        </CalSection>
  );
  const inputEl = startDate && (
          <InputSection>
            <RangeDisplay>{formatRange()}</RangeDisplay>
            <Input placeholder="작업 내용 (예: 욕실 타일 시공)" value={title} onChange={(e) => setTitle(e.target.value)} />
            {title.trim() && (
              <AddBtn onClick={handleAddToList}>+ 일정 추가하고 계속 만들기</AddBtn>
            )}
          </InputSection>
        );
  const completeEl = (
    <CompleteBtn onClick={handleComplete} disabled={allItems.length === 0 || saving}>
      {saving ? "저장 중..." : allItems.length > 1 ? `${allItems.length}건 일정 등록` : "완료"}
    </CompleteBtn>
  );

  /* PC — 왼쪽 달력(기간 고르기) · 오른쪽 내용 입력과 등록할 일정 목록, 등록 버튼 */
  if (pcWide) {
    return (
      <PageWrap>
        <Header>
          <HeaderTitle>일정 등록</HeaderTitle>
          <CloseBtn onClick={handleClose}>
            <IoCloseOutline size={28} color={THEME.text} />
          </CloseBtn>
        </Header>
        <FormScroll>
          <PcCols>
            {calEl}
            <PcSide>
              <PcCard>
                <PcCardTitle>일정 내용</PcCardTitle>
                {startDate ? inputEl : <PcText>왼쪽 달력에서 날짜를 눌러 기간을 고르세요. 시작일을 누른 뒤 종료일을 누르면 기간이 잡힙니다.</PcText>}
              </PcCard>
              <PcCard>
                <PcCardTitle>등록할 일정 {allItems.length}건</PcCardTitle>
                {allItems.length === 0 ? (
                  <PcText>기간과 작업 내용을 넣으면 여기에 쌓입니다.</PcText>
                ) : allItems.map((it, idx) => (
                  <PcItemRow key={idx}>
                    <div><b>{it.title}</b><span>{fmtItem(it)}</span></div>
                    {idx < schedList.length
                      ? <PcRemove type="button" onClick={() => removeFromList(idx)}>빼기</PcRemove>
                      : <span>입력 중</span>}
                  </PcItemRow>
                ))}
                <PcBtnLine>
                  <PcCancel type="button" onClick={handleClose}>취소</PcCancel>
                  {completeEl}
                </PcBtnLine>
              </PcCard>
            </PcSide>
          </PcCols>
        </FormScroll>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <Header>
        <HeaderTitle>일정 등록</HeaderTitle>
        <CloseBtn onClick={handleClose}>
          <IoCloseOutline size={28} color={THEME.text} />
        </CloseBtn>
      </Header>

      <FormScroll>
        {/* 미니 캘린더 */}
        {calEl}

        {/* 선택된 기간 + 입력 */}
        {inputEl}

        <BottomSpacer />
      </FormScroll>

      <FixedBottom>
        {completeEl}
      </FixedBottom>
    </PageWrap>
  );
};

export default ScheduleCreatePage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  height: var(--app-h, 100vh);
  display: flex;
  flex-direction: column;
  background: ${THEME.background};
  .pc-mode & { background: #F7F8FA; }
`;

/* ===== PC 전용 ===== */
const PcCols = styled.div`
  display: grid; grid-template-columns: 520px minmax(0, 1fr); gap: 24px; align-items: start;
  @media (max-width: 1240px) { grid-template-columns: minmax(0, 520px); }
`;
const PcSide = styled.div` display: flex; flex-direction: column; gap: 20px; min-width: 0; `;
const PcCard = styled.section` background: #fff; border: 1px solid #dfe3e8; padding: 24px 26px; `;
const PcCardTitle = styled.h2` font-size: 18px; font-weight: 800; margin: 0 0 14px; color: #14181F; `;
const PcText = styled.div` font-size: 15px; line-height: 1.6; color: #2b2f36; word-break: keep-all; `;
const PcItemRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 0; border-top: 1px solid #dfe3e8; word-break: keep-all;
  & > div { display: grid; gap: 4px; min-width: 0; } b { font-size: 16px; font-weight: 700; color: #14181F; } span { font-size: 15px; color: #2b2f36; }
`;
const PcRemove = styled.button`
  border: 1px solid #dfe3e8; background: #fff; color: #14181F; border-radius: 8px; padding: 8px 14px; cursor: pointer; flex-shrink: 0;
  font-size: 14px; font-weight: 700; font-family: inherit; &:hover { border-color: #14181F; }
`;
const PcBtnLine = styled.div` display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 18px; border-top: 1px solid #dfe3e8; `;
const PcCancel = styled.button`
  border: 1px solid #dfe3e8; background: #fff; color: #14181F; border-radius: 10px; padding: 0 20px; height: 48px; cursor: pointer;
  font-size: 15px; font-weight: 700; font-family: inherit; &:hover { border-color: #14181F; }
`;
const Header = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
  .pc-mode & { height: 60px; justify-content: flex-start; padding: 0 24px; background: #fff; }
`;
const HeaderTitle = styled.div`
  font-size: 19px;
  font-weight: 400;
  color: ${THEME.text};
  .pc-mode & { font-size: 22px; font-weight: 800; }
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
  padding: 12px;
  .pc-mode & { padding: 30px 32px 80px; }
`;

/* 캘린더 */
const CalSection = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 16px 8px;
  margin-bottom: 12px;
  .pc-mode & { border: 1px solid #dfe3e8; border-radius: 0; padding: 22px 18px; margin-bottom: 0; }
`;
const CalNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
`;
const CalNavBtn = styled.button`
  background: none; border: none; padding: 4px; cursor: pointer;
  display: flex; align-items: center; color: ${THEME.text};
  &:active { opacity: 0.5; }
`;
const CalTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;
const CalDayHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
`;
const CalDayLabel = styled.div`
  text-align: center;
  font-size: 14px;
  color: ${({ $sun }) => $sun ? "#EF4444" : ({ $sat }) => $sat ? "#3B82F6" : THEME.muted};
  padding: 4px 0;
`;
const CalRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
`;
const CalCell = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 0;
  cursor: ${({ $empty }) => $empty ? "default" : "pointer"};
`;
const CalDateWrap = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 0;
  background: ${({ $inRange, $isSame }) => $isSame ? "transparent" : $inRange ? `${THEME.purple}18` : "transparent"};
  border-radius: ${({ $isStart, $isEnd, $isSame }) =>
    $isSame ? "0" : $isStart ? "20px 0 0 20px" : $isEnd ? "0 20px 20px 0" : "0"};
`;
const CalNum = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: ${({ $selected, $sun, $sat }) =>
    $selected ? "#fff" : $sun ? "#EF4444" : $sat ? "#3B82F6" : THEME.text};
  background: ${({ $selected }) => $selected ? THEME.purple : "transparent"};
`;
const CalHint = styled.div`
  text-align: center;
  font-size: 14px;
  color: ${THEME.muted};
  margin-top: 8px;
  .pc-mode & { color: #14181F; font-size: 15px; margin-top: 14px; }
`;

const RangeDisplay = styled.div`
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.primary};
  padding: 10px 0;
  margin-bottom: 8px;
  .pc-mode & { text-align: left; padding: 0 0 6px; color: ${THEME.primaryDark}; }
`;

const InputSection = styled.div`
  padding: 0 4px;
  margin-bottom: 12px;
  .pc-mode & { padding: 0; margin-bottom: 0; }
`;

const AddBtn = styled.div`
  text-align: center;
  font-size: 15px;
  font-weight: 500;
  color: ${THEME.primary};
  padding: 10px 0 4px;
  cursor: pointer;
  &:active { opacity: 0.6; }
  .pc-mode & { text-align: left; font-weight: 700; color: ${THEME.primaryDark}; padding: 14px 0 0; &:hover { text-decoration: underline; } }
`;

const BarRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-top: -4px;
`;

const Bar = styled.div`
  grid-column: ${({ $col, $colEnd }) => `${$col} / ${$colEnd}`};
  background: ${THEME.button};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 6px;
  border-radius: 4px;
  margin: 1px 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  line-height: 1.4;
`;

/* 폼 */
const Section = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 10px;
`;
const Label = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 8px;
`;
const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 17px;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;
const RowPicker = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const SelectWrap = styled.div`
  flex: 1;
  padding: 12px 14px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
`;
const Select = styled.select`
  width: 100%;
  border: none;
  background: transparent;
  font-size: 17px;
  color: ${THEME.text};
  outline: none;
  appearance: none;
  -webkit-appearance: none;
`;
const TimeSep = styled.span`
  font-size: 16px;
  color: ${THEME.muted};
`;
const BottomSpacer = styled.div`
  height: 80px;
`;
const FixedBottom = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--app-max, 400px);
  z-index: 900;
`;
const CompleteBtn = styled.button`
  width: 100%;
  height: 56px;
  border: none;
  background: ${({ disabled }) => disabled ? THEME.border : THEME.purple};
  color: #fff;
  font-size: 19px;
  font-weight: 400;
  cursor: ${({ disabled }) => disabled ? "default" : "pointer"};
  &:active { background: ${({ disabled }) => disabled ? THEME.border : THEME.buttonDark}; }
  .pc-mode & { width: auto; min-width: 180px; height: 48px; padding: 0 24px; border-radius: 10px; font-size: 16px; font-weight: 700; &:disabled { background: #e9ecf1; color: #2b2f36; } }
`;
