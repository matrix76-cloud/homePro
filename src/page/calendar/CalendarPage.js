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
        setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.source !== "chat"));
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

  return (
    <SimpleBackLayout
      NAME="나의 일정"
      hideFooter
      rightAction={<TodayBtn onClick={goToday}>오늘</TodayBtn>}
    >
      <Wrapper>
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
                      <DateCell key={ci} onClick={() => day && setSelectedDate(day)}>
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

        {/* FAB */}
        <FabWrap>
          <Fab onClick={handleCreate}>
            <IoAddOutline size={28} color="#fff" />
          </Fab>
        </FabWrap>
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
`;

const TodayBtn = styled.button`
  background: none; border: none; font-size: 14px; font-weight: 400;
  color: ${THEME.text}; cursor: pointer; padding: 6px 12px;
  &:active { opacity: 0.6; }
`;

const MonthNav = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 20px;
  padding: 20px 0 16px; background: ${THEME.surface};
  margin: 12px 12px 0; border-radius: 16px 16px 0 0;
`;
const NavBtn = styled.button`
  background: none; border: none; padding: 4px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  &:active { opacity: 0.5; }
`;
const MonthTitle = styled.div`
  font-size: 20px; font-weight: 700; color: ${THEME.text};
`;

const DayHeader = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr);
  padding: 0 8px; margin: 0 12px; background: ${THEME.surface};
`;
const DayCell = styled.div`
  text-align: center; font-size: 13px; font-weight: 400;
  color: ${({ $isSun }) => $isSun ? "#EF4444" : ({ $isSat }) => $isSat ? "#3B82F6" : THEME.muted};
  padding: 8px 0;
`;

const CalGrid = styled.div`
  padding: 0 8px; margin: 0 12px;
  background: ${THEME.surface}; border-radius: 0 0 16px 16px;
  padding-bottom: 12px;
`;

const CalRow = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr);
  min-height: 40px;
`;

const DateCell = styled.div`
  display: flex; flex-direction: column; align-items: center;
  padding: 4px 0; cursor: pointer;
`;

const DateNum = styled.div`
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 400;
  color: ${({ $isToday, $isSun, $isSat }) =>
    $isToday ? "#fff" : $isSun ? "#EF4444" : $isSat ? "#3B82F6" : THEME.text};
  background: ${({ $isToday }) => $isToday ? THEME.purple : "transparent"};
`;

const HolidayLabel = styled.div`
  font-size: 9px; color: #EF4444; margin-top: 1px; line-height: 1;
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
  background: ${THEME.primary};
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 4px;
  margin: 1px 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  line-height: 1.3;
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
