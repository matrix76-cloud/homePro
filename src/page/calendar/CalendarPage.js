/* eslint-disable */
import React, { useState, useMemo, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoChevronBack, IoChevronForward, IoAddOutline } from "react-icons/io5";
import usePcWide from "../../hooks/usePcWide";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const HOLIDAYS = {
  "2026-01-01": "신정",
  "2026-01-27": "설날", "2026-01-28": "설날", "2026-01-29": "설날",
  "2026-02-16": "설날", "2026-02-17": "설날", "2026-02-18": "설날",
  "2026-03-01": "삼일절",
  "2026-05-05": "어린이날", "2026-05-24": "부처님오신날",
  "2026-06-06": "현충일", "2026-08-15": "광복절",
  "2026-09-24": "추석", "2026-09-25": "추석", "2026-09-26": "추석",
  "2026-10-03": "개천절", "2026-10-09": "한글날", "2026-12-25": "크리스마스",
};

const pad = (n) => String(n).padStart(2, "0");

const CalendarPage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const startKey = `${year}-${pad(month + 1)}-01`;
        const endKey = `${year}-${pad(month + 1)}-31`;
        const q = query(
          collection(db, "homepro_schedules"),
          where("uid", "==", uid),
          where("date", ">=", startKey),
          where("date", "<=", endKey)
        );
        const snap = await getDocs(q);
        // 채팅에서 공유된 일정도 함께 표시 (전수검사 7/29: 제외 필터 때문에
        // 공유 일정이 어떤 화면에도 안 나오던 문제 — source 로 구분만 하고 모두 노출)
        setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("일정 조회 실패:", e);
      }
    })();
  }, [uid, year, month]);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = [];
    let row = [];
    for (let i = 0; i < firstDay; i++) row.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      row.push(d);
      if (row.length === 7) { rows.push(row); row = []; }
    }
    if (row.length > 0) { while (row.length < 7) row.push(null); rows.push(row); }
    return rows;
  }, [year, month]);

  /* 스케줄을 그룹화하여 바 아이템으로 변환 */
  const barItems = useMemo(() => {
    const groups = {};
    const singles = [];
    schedules.forEach((s) => {
      if (s.groupId) {
        if (!groups[s.groupId]) {
          groups[s.groupId] = { ...s, dates: [s.date] };
        } else {
          groups[s.groupId].dates.push(s.date);
        }
      } else {
        singles.push({ ...s, startDate: s.date, endDate: s.date });
      }
    });
    const merged = Object.values(groups).map((g) => {
      const sorted = g.dates.sort();
      return { ...g, startDate: sorted[0], endDate: sorted[sorted.length - 1] };
    });
    return [...merged, ...singles];
  }, [schedules]);

  /* 주별 바 계산 */
  const getWeekBars = (week) => {
    const weekDates = week.map((d) => d ? `${year}-${pad(month + 1)}-${pad(d)}` : null);
    const ws = weekDates.find((d) => d !== null);
    const we = [...weekDates].reverse().find((d) => d !== null);
    if (!ws || !we) return [];

    return barItems
      .filter((b) => b.startDate <= we && b.endDate >= ws)
      .map((b) => {
        const startCol = weekDates.findIndex((d) => d && d >= b.startDate);
        const endCol = 6 - [...weekDates].reverse().findIndex((d) => d && d <= b.endDate);
        return {
          ...b,
          col: Math.max(0, startCol) + 1,
          colEnd: Math.min(7, endCol) + 2,
        };
      });
  };

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
    setSelectedDate(1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
    setSelectedDate(1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(today.getDate());
  };

  const getHoliday = (day) => {
    if (!day) return null;
    return HOLIDAYS[`${year}-${pad(month + 1)}-${pad(day)}`] || null;
  };
  const isToday = (day) => day && isCurrentMonth && day === today.getDate();

  const handleCreate = () => {
    navigate("/calendar/create", {
      state: { date: { year, month: month + 1, day: selectedDate } },
    });
  };

  // PC 오른쪽 단 — 고른 날의 일정과 이번 달 일정(이미 불러온 schedules 로만 그린다)
  const monthFirst = `${year}-${pad(month + 1)}-01`;
  const selKey = `${year}-${pad(month + 1)}-${pad(selectedDate)}`;
  const fmtDay = (key) => { const d = new Date(key); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`; };
  const fmtRange = (b) => (b.startDate === b.endDate ? fmtDay(b.startDate) : `${fmtDay(b.startDate)} ~ ${fmtDay(b.endDate)}`);
  const dayItems = barItems.filter((b) => b.startDate <= selKey && b.endDate >= selKey);
  const monthItems = [...barItems].sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  const Cols = pcWide ? PcCols : React.Fragment;
  const CalBox = pcWide ? PcCalBox : React.Fragment;

  return (
    <SimpleBackLayout
      NAME="나의 일정"
      hideFooter
      rightAction={pcWide ? (
        <PcHeadBtns>
          <PcGhost onClick={goToday}>오늘</PcGhost>
          <PcAdd onClick={handleCreate}><IoAddOutline size={19} />일정 추가</PcAdd>
        </PcHeadBtns>
      ) : <TodayBtn onClick={goToday}>오늘</TodayBtn>}
    >
      <Wrapper>
        <Cols>
        <CalBox>
        <MonthNav>
          <NavBtn onClick={prevMonth}><IoChevronBack size={20} color={THEME.text} /></NavBtn>
          <MonthTitle>{year}년 {month + 1}월</MonthTitle>
          <NavBtn onClick={nextMonth}><IoChevronForward size={20} color={THEME.text} /></NavBtn>
        </MonthNav>

        <DayHeader>
          {DAYS.map((d, i) => (
            <DayCell key={d} $isSun={i === 0} $isSat={i === 6}>{d}</DayCell>
          ))}
        </DayHeader>

        <CalGrid>
          {calendarDays.map((row, ri) => {
            const bars = getWeekBars(row);
            // 바를 레인별로 분배
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
                  {row.map((day, ci) => {
                    const holiday = getHoliday(day);
                    return (
                      <DateCell key={ci} $sel={!!day && day === selectedDate} onClick={() => day && setSelectedDate(day)}>
                        {day && (
                          <DateNum
                            $isToday={isToday(day)}
                            $isSun={ci === 0 || !!holiday}
                            $isSat={ci === 6}
                          >
                            {day}
                          </DateNum>
                        )}
                        {holiday && <HolidayLabel>{holiday}</HolidayLabel>}
                      </DateCell>
                    );
                  })}
                </CalRow>
                {/* 바 영역 */}
                {barRows.map((bRow, bri) => (
                  <WeekBarRow key={bri}>
                    {bRow.map((bar, bi) => (
                      <CalBar key={bi} $col={bar.col} $colEnd={bar.colEnd}>
                        {bar.title}
                      </CalBar>
                    ))}
                  </WeekBarRow>
                ))}
              </React.Fragment>
            );
          })}
        </CalGrid>
        </CalBox>

        {pcWide && (
          <PcRight>
            <PcPanel>
              <PcPanelTitle>{fmtDay(selKey)}{getHoliday(selectedDate) ? ` · ${getHoliday(selectedDate)}` : ""}</PcPanelTitle>
              {dayItems.length === 0 ? (
                <PcPanelEmpty>이 날에는 등록된 일정이 없습니다.</PcPanelEmpty>
              ) : dayItems.map((b) => (
                <PcDayRow key={b.id}>
                  <b>{b.title}</b>
                  <span>{fmtRange(b)}{b.source === "chat" ? " · 채팅에서 공유" : ""}</span>
                </PcDayRow>
              ))}
              <PcPanelFoot><PcGhost onClick={handleCreate}>이 날짜로 일정 추가</PcGhost></PcPanelFoot>
            </PcPanel>

            <PcPanel $flush>
              <PcPanelTitle style={{ padding: "20px 24px 14px", margin: 0 }}>{month + 1}월 일정 {monthItems.length}건</PcPanelTitle>
              <PcMonthHead><span>기간</span><span>내용</span></PcMonthHead>
              {monthItems.length === 0 ? (
                <PcPanelEmpty style={{ padding: "40px 24px" }}>이번 달에 등록된 일정이 없습니다.</PcPanelEmpty>
              ) : monthItems.map((b) => (
                <PcMonthRow key={b.id} onClick={() => setSelectedDate(Number((b.startDate < monthFirst ? monthFirst : b.startDate).slice(8)))}>
                  <span>{fmtRange(b)}</span>
                  <b>{b.title}</b>
                </PcMonthRow>
              ))}
            </PcPanel>
          </PcRight>
        )}
        </Cols>

        {/* FAB — PC 에서는 제목 줄의 "일정 추가" 버튼이 대신한다 */}
        {!pcWide && (
        <FabWrap>
          <Fab onClick={handleCreate}>
            <IoAddOutline size={28} color="#fff" />
          </Fab>
        </FabWrap>
        )}
      </Wrapper>
    </SimpleBackLayout>
  );
};

export default CalendarPage;

/* ===================== styles ===================== */

const Wrapper = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding-bottom: 80px;
  .pc-mode & { background: #F7F8FA; padding: 30px 32px 80px; box-sizing: border-box; }
`;

/* ===== PC 전용 ===== */
// 왼쪽 달력(폭 520) · 오른쪽 그날 일정. 본문이 좁으면 위아래로 접는다
const PcCols = styled.div`
  display: grid; grid-template-columns: 520px minmax(0, 1fr); gap: 24px; align-items: start;
  @media (max-width: 1240px) { grid-template-columns: minmax(0, 520px); }
`;
const PcCalBox = styled.div` background: #fff; border: 1px solid #dfe3e8; padding: 8px 14px 14px; `;
const PcRight = styled.div` display: flex; flex-direction: column; gap: 20px; min-width: 0; `;
const PcPanel = styled.section` background: #fff; border: 1px solid #dfe3e8; padding: ${({ $flush }) => ($flush ? "0" : "24px 26px")}; min-height: ${({ $flush }) => ($flush ? "0" : "220px")}; display: flex; flex-direction: column; `;
const PcPanelTitle = styled.h2` font-size: 18px; font-weight: 800; margin: 0 0 14px; color: #14181F; `;
const PcPanelEmpty = styled.div` font-size: 15px; color: #14181F; padding: 18px 0; `;
const PcPanelFoot = styled.div` margin-top: auto; padding-top: 16px; `;
const PcDayRow = styled.div`
  display: grid; gap: 4px; padding: 14px 0; border-top: 1px solid #dfe3e8; word-break: keep-all;
  b { font-size: 16px; font-weight: 700; color: #14181F; } span { font-size: 15px; color: #2b2f36; }
`;
const PC_MONTH_COLS = "minmax(190px, 0.9fr) minmax(0, 1.4fr)";
const PcMonthHead = styled.div` display: grid; grid-template-columns: ${PC_MONTH_COLS}; gap: 12px; padding: 14px 24px; background: #e9ecf1; font-size: 15px; font-weight: 700; color: #14181F; `;
const PcMonthRow = styled.div`
  display: grid; grid-template-columns: ${PC_MONTH_COLS}; gap: 12px; padding: 15px 24px; border-top: 1px solid #dfe3e8; cursor: pointer;
  font-size: 16px; color: #14181F; word-break: keep-all; b { font-weight: 700; } &:hover { background: #f4f6f8; }
`;
const PcHeadBtns = styled.div` display: flex; align-items: center; gap: 10px; `;
const PcGhost = styled.button`
  border: 1px solid #dfe3e8; background: #fff; color: #14181F; border-radius: 10px; padding: 10px 16px; cursor: pointer;
  font-size: 15px; font-weight: 700; font-family: inherit; &:hover { border-color: #14181F; }
`;
const PcAdd = styled.button`
  border: none; background: #00963F; color: #fff; border-radius: 10px; padding: 10px 16px; cursor: pointer;
  font-size: 15px; font-weight: 700; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; &:hover { background: #007A33; }
`;

const TodayBtn = styled.button`
  background: none; border: none; font-size: 16px; font-weight: 400;
  color: ${THEME.text}; cursor: pointer; padding: 6px 12px;
  &:active { opacity: 0.6; }
`;

const MonthNav = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 20px;
  padding: 20px 0 16px; background: ${THEME.surface};
  margin: 12px 12px 0; border-radius: 16px 16px 0 0;
  .pc-mode & { margin: 0; border-radius: 0; }
`;
const NavBtn = styled.button`
  background: none; border: none; padding: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  &:active { opacity: 0.5; }
`;
const MonthTitle = styled.div`
  font-size: 22px; font-weight: 700; color: ${THEME.text};
`;

const DayHeader = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr);
  padding: 0 8px; margin: 0 12px; background: ${THEME.surface};
  .pc-mode & { margin: 0; padding: 0; border-bottom: 1px solid #dfe3e8; }
`;
const DayCell = styled.div`
  text-align: center; font-size: 15px; font-weight: 400;
  color: ${({ $isSun }) => $isSun ? "#EF4444" : ({ $isSat }) => $isSat ? "#3B82F6" : THEME.muted};
  padding: 8px 0;
  .pc-mode & { font-weight: 700; ${({ $isSun, $isSat }) => (!$isSun && !$isSat ? "color: #14181F;" : "")} }
`;

const CalGrid = styled.div`
  padding: 0 8px; margin: 0 12px;
  background: ${THEME.surface}; border-radius: 0 0 16px 16px;
  padding-bottom: 12px;
  .pc-mode & { margin: 0; padding: 6px 0 0; border-radius: 0; }
`;

const CalRow = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr);
  min-height: 40px;
  .pc-mode & { min-height: 52px; }
`;

const DateCell = styled.div`
  display: flex; flex-direction: column; align-items: center;
  padding: 4px 0; cursor: pointer;
  .pc-mode & { padding: 8px 0; background: ${({ $sel }) => ($sel ? "#e9ecf1" : "transparent")}; &:hover { background: ${({ $sel }) => ($sel ? "#e9ecf1" : "#f4f6f8")}; } }
`;

const DateNum = styled.div`
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 400;
  color: ${({ $isToday, $isSun, $isSat }) =>
    $isToday ? "#fff" : $isSun ? "#EF4444" : $isSat ? "#3B82F6" : THEME.text};
  background: ${({ $isToday }) => $isToday ? THEME.purple : "transparent"};
`;

const HolidayLabel = styled.div`
  font-size: 13px; color: #EF4444; margin-top: 1px; line-height: 1;
`;

/* 바 */
const WeekBarRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 2px;
  min-height: 18px;
`;

const CalBar = styled.div`
  grid-column: ${({ $col, $colEnd }) => `${$col} / ${$colEnd}`};
  background: ${THEME.button};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 4px;
  margin: 1px 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  line-height: 1.3;
  .pc-mode & { white-space: normal; text-overflow: clip; font-size: 14px; padding: 3px 7px; }
`;

const FabWrap = styled.div`
  position: fixed;
  bottom: 24px;
  right: calc(50% - 176px);
  z-index: 90;
`;
const Fab = styled.button`
  width: 52px; height: 52px; border-radius: 50%;
  border: none; background: ${THEME.purple}; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 4px 12px rgba(37, 113, 227, 0.4);
  &:active { transform: scale(0.95); }
  transition: transform 0.1s;
`;
