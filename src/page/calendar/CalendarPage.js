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
import { IoChevronBack, IoChevronForward, IoAddOutline, IoTimeOutline, IoLocationOutline } from "react-icons/io5";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

/* ─── 공휴일 데이터 (2026) ─── */
const HOLIDAYS = {
  "2026-01-01": "신정",
  "2026-01-27": "설날",
  "2026-01-28": "설날",
  "2026-01-29": "설날",
  "2026-02-16": "설날",
  "2026-02-17": "설날",
  "2026-02-18": "설날",
  "2026-03-01": "삼일절",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-09-24": "추석",
  "2026-09-25": "추석",
  "2026-09-26": "추석",
  "2026-10-03": "개천절",
  "2026-10-09": "한글날",
  "2026-12-25": "크리스마스",
};

const pad = (n) => String(n).padStart(2, "0");

const HOUR_LABEL = (h) => {
  const period = h < 12 ? "오전" : "오후";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${display}시`;
};

const CalendarPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [schedules, setSchedules] = useState([]);

  // 월 변경 시 일정 조회
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
        setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("일정 조회 실패:", e);
      }
    })();
  }, [uid, year, month]);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  /* 달력 그리드 생성 */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = [];
    let row = [];

    // 앞쪽 빈칸
    for (let i = 0; i < firstDay; i++) row.push(null);
    // 날짜 채우기
    for (let d = 1; d <= daysInMonth; d++) {
      row.push(d);
      if (row.length === 7) {
        rows.push(row);
        row = [];
      }
    }
    // 마지막 줄 채우기
    if (row.length > 0) {
      while (row.length < 7) row.push(null);
      rows.push(row);
    }
    return rows;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(today.getDate());
  };

  const getHoliday = (day) => {
    if (!day) return null;
    const key = `${year}-${pad(month + 1)}-${pad(day)}`;
    return HOLIDAYS[key] || null;
  };

  const isToday = (day) =>
    day && isCurrentMonth && day === today.getDate();

  const selectedKey = `${year}-${pad(month + 1)}-${pad(selectedDate)}`;
  const dayOfWeek = selectedDate
    ? DAYS[new Date(year, month, selectedDate).getDay()]
    : "";

  const getSchedulesForDay = (day) => {
    if (!day) return [];
    const key = `${year}-${pad(month + 1)}-${pad(day)}`;
    return schedules.filter((s) => s.date === key);
  };

  const selectedSchedules = schedules.filter((s) => s.date === selectedKey);

  const handleCreate = () => {
    navigate("/calendar/create", {
      state: { date: { year, month: month + 1, day: selectedDate } },
    });
  };

  return (
    <SimpleBackLayout
      NAME="캘린더"
      hideFooter
      rightAction={<TodayBtn onClick={goToday}>오늘</TodayBtn>}
    >
      <Wrapper>
        {/* 월 네비게이션 */}
        <MonthNav>
          <NavBtn onClick={prevMonth}><IoChevronBack size={20} color={THEME.text} /></NavBtn>
          <MonthTitle>{year}년 {month + 1}월</MonthTitle>
          <NavBtn onClick={nextMonth}><IoChevronForward size={20} color={THEME.text} /></NavBtn>
        </MonthNav>

        {/* 요일 헤더 */}
        <DayHeader>
          {DAYS.map((d, i) => (
            <DayCell key={d} $isSun={i === 0} $isSat={i === 6}>{d}</DayCell>
          ))}
        </DayHeader>

        {/* 달력 그리드 */}
        <CalGrid>
          {calendarDays.map((row, ri) => (
            <CalRow key={ri}>
              {row.map((day, ci) => {
                const holiday = getHoliday(day);
                const isSunday = ci === 0;
                const isSaturday = ci === 6;
                return (
                  <DateCell
                    key={ci}
                    onClick={() => day && setSelectedDate(day)}
                    $active={day === selectedDate}
                  >
                    {day && (
                      <>
                        <DateNum
                          $isToday={isToday(day)}
                          $isSun={isSunday || !!holiday}
                          $isSat={isSaturday}
                          $active={day === selectedDate}
                        >
                          {day}
                        </DateNum>
                        {holiday && <HolidayLabel>{holiday}</HolidayLabel>}
                        {getSchedulesForDay(day).slice(0, 2).map((s, si) => (
                          <EventLabel key={si}>{s.title}</EventLabel>
                        ))}
                        {getSchedulesForDay(day).length > 2 && (
                          <EventLabel $more>+{getSchedulesForDay(day).length - 2}</EventLabel>
                        )}
                      </>
                    )}
                  </DateCell>
                );
              })}
            </CalRow>
          ))}
        </CalGrid>

        {/* 선택된 날짜 정보 */}
        <BottomBar>
          <SelectedDateText>
            {year}년 {pad(month + 1)}월 {pad(selectedDate)}일 ({dayOfWeek})
          </SelectedDateText>
          <Fab onClick={handleCreate}>
            <IoAddOutline size={28} color="#fff" />
          </Fab>
        </BottomBar>
        {selectedSchedules.length === 0 ? (
          <NoSchedule>일정이 없습니다.</NoSchedule>
        ) : (
          <ScheduleList>
            {selectedSchedules.map((s) => (
              <ScheduleCard key={s.id}>
                <ScheduleTitle>{s.title}</ScheduleTitle>
                <ScheduleInfo>
                  <IoTimeOutline size={13} color={THEME.muted} />
                  {HOUR_LABEL(s.startHour)} ~ {HOUR_LABEL(s.endHour)}
                </ScheduleInfo>
                {s.location && (
                  <ScheduleInfo>
                    <IoLocationOutline size={13} color={THEME.muted} />
                    {s.location}
                  </ScheduleInfo>
                )}
                {s.memo && <ScheduleMemo>{s.memo}</ScheduleMemo>}
              </ScheduleCard>
            ))}
          </ScheduleList>
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
`;

const TodayBtn = styled.button`
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
  cursor: pointer;
  padding: 6px 12px;
  &:active { opacity: 0.6; }
`;

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px 0 16px;
  background: ${THEME.surface};
  margin: 12px 12px 0;
  border-radius: 16px 16px 0 0;
`;

const NavBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.5; }
`;

const MonthTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const DayHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 8px;
  margin: 0 12px;
  background: ${THEME.surface};
`;

const DayCell = styled.div`
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: ${({ $isSun }) => $isSun ? "#EF4444" : ({ $isSat }) => $isSat ? "#3B82F6" : THEME.muted};
  padding: 8px 0;
`;

const CalGrid = styled.div`
  flex: 1;
  padding: 0 8px;
  margin: 0 12px;
  background: ${THEME.surface};
  border-radius: 0 0 16px 16px;
`;

const CalRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 72px;
`;

const DateCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
  cursor: pointer;
  border-radius: 8px;
  &:active { background: ${THEME.background}; }
`;

const DateNum = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 400;
  color: ${({ $isToday, $isSun, $isSat }) =>
    $isToday ? "#fff" : $isSun ? "#EF4444" : $isSat ? "#3B82F6" : THEME.text};
  background: ${({ $isToday }) => $isToday ? THEME.purple : "transparent"};
`;

const HolidayLabel = styled.div`
  font-size: 10px;
  font-weight: 400;
  color: #EF4444;
  margin-top: 2px;
  line-height: 1;
`;

const EventCount = styled.div`
  font-size: 10px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 1px;
`;

const BottomBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid ${THEME.border};
  margin-top: auto;
`;

const SelectedDateText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
`;

const Fab = styled.button`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: ${THEME.purple};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(124, 92, 252, 0.4);
  &:active { transform: scale(0.95); }
  transition: transform 0.1s;
`;

const NoSchedule = styled.div`
  text-align: center;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  padding: 12px 0 24px;
`;

const EventLabel = styled.div`
  font-size: 9px;
  font-weight: 400;
  color: ${({ $more }) => $more ? THEME.muted : THEME.primary};
  margin-top: 1px;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
`;

const ScheduleList = styled.div`
  padding: 0 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ScheduleCard = styled.div`
  background: ${THEME.surface};
  border-radius: 12px;
  padding: 14px 16px;
  border-left: 3px solid ${THEME.primary};
`;

const ScheduleTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ScheduleInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const ScheduleMemo = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
  line-height: 1.4;
`;
