/* eslint-disable */
import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

/* ─── 목업 오더 (전 카테고리) ─── */
/* orderStatus: 접수 | 지원가능 | 배차대기 | 취소 | 완료  /  matchType: 다중 | 우선 */
export const MOCK_ORDERS = {
  professional_cleaning: [
    { id: "pc1", workDate: "02.10.", orderStatus: "접수", matchType: "다중", title: "입주 전 전체 청소 부탁합니다", subcategory: "입주청소(신축)", description: "32평 신축 아파트 입주청소\n베란다 포함 전체 청소 원합니다", location: "진접읍", schedule: "2월 20일 지정", createdAt: "10분 전", spaceType: "아파트", writer: "한**", price: "320,000" },
    { id: "pc2", workDate: "02.15.", orderStatus: "지원가능", matchType: "다중", title: "거주 중 집 전체 대청소", subcategory: "거주청소", description: "25평 아파트 거주청소\n주방·화장실 집중 요청", location: "서울 송파구", schedule: "협의가능", createdAt: "2시간 전", spaceType: "아파트", writer: "윤**", price: "150,000" },
  ],
  plumbing: [
    { id: "pl1", workDate: "03.02.", orderStatus: "접수", matchType: "다중", title: "화장실 천장에서 물이 새요", subcategory: "배관누수 점검", description: "화장실 천장 코너에서 물방울 떨어짐\n윗집 누수인지 확인 필요", location: "서울 마포구", schedule: "가능한 빨리", createdAt: "40분 전", spaceType: "아파트", writer: "노**", price: "현장견적후" },
    { id: "pl2", workDate: "당일", orderStatus: "접수", matchType: "우선", title: "싱크대 하수구 역류", subcategory: "하수구 막힘", description: "싱크대에서 물이 역류하고 있어요\n긴급 요청합니다", location: "서울 강서구", schedule: "오늘 가능하신 분", createdAt: "15분 전", spaceType: "아파트", writer: "이**", price: "견적요청" },
  ],
  appliance_cleaning: [
    { id: "ac1", workDate: "02.11.", orderStatus: "접수", matchType: "우선", title: "에어컨 3대 분해청소 요청", subcategory: "에어컨청소", description: "벽걸이 2대 + 스탠드 1대\n항균코팅 포함 희망", location: "구미동", schedule: "이번 주 토요일", createdAt: "5분 전", spaceType: "아파트", writer: "장**", price: "영업정보" },
  ],
  home_repair: [
    { id: "hr1", workDate: "02.20.", orderStatus: "접수", matchType: "다중", title: "욕실 거울 교체 요청", subcategory: "거울교체", description: "욕실 거울 깨짐, 새 거울로 교체 원합니다", location: "서울 영등포구", schedule: "협의가능", createdAt: "1시간 전", spaceType: "아파트", writer: "서**", price: "견적요청" },
    { id: "hr2", workDate: "02.18.", orderStatus: "접수", matchType: "다중", title: "방충망 전체 교체", subcategory: "방충망교체", description: "노후 방충망 전체 교체 원합니다", location: "서울 동대문구", schedule: "이번 주 내", createdAt: "30분 전", spaceType: "아파트", writer: "정**", price: "견적요청" },
  ],
  electrical: [
    { id: "el1", workDate: "02.13.", orderStatus: "접수", matchType: "다중", title: "거실 콘센트 합선된 것 같아요", subcategory: "콘센트.스위치", description: "콘센트에서 불꽃 튀고 차단기 내려감\n전기 점검 필요", location: "서울 성동구", schedule: "가능한 빨리", createdAt: "20분 전", spaceType: "아파트", writer: "임**", price: "견적요청" },
  ],
  mattress_care: [
    { id: "mc1", workDate: "02.16.", orderStatus: "접수", matchType: "다중", title: "킹사이즈 매트리스 케어", subcategory: "침대매트리스", description: "킹사이즈 매트리스 2개 살균+청소 요청", location: "서울 강남구", schedule: "주말 희망", createdAt: "1시간 전", spaceType: "아파트", writer: "박**", price: "100,000" },
  ],
  aircon_install: [
    { id: "ai1", workDate: "긴급", orderStatus: "접수", matchType: "우선", title: "에어컨 신규설치 요청", subcategory: "신규설치", description: "거실 스탠드 에어컨 1대 신규 설치", location: "서울 강동구", schedule: "오늘 가능하신 분", createdAt: "30분 전", spaceType: "아파트", writer: "김**", price: "확정가" },
  ],
  appliance_install: [
    { id: "ap1", workDate: "02.14.", orderStatus: "접수", matchType: "다중", title: "세탁기 설치 요청", subcategory: "세탁기/건조기", description: "드럼세탁기 새로 구매, 설치 요청합니다", location: "서울 은평구", schedule: "이번 주 내", createdAt: "45분 전", spaceType: "아파트", writer: "최**", price: "50,000" },
  ],
  boiler: [
    { id: "bl1", workDate: "긴급", orderStatus: "접수", matchType: "우선", title: "보일러 안 켜져요 긴급!", subcategory: "보일러 수리", description: "갑자기 보일러가 안 켜짐\n온수도 안 나옵니다", location: "서울 노원구", schedule: "오늘 가능하신 분", createdAt: "1시간 전", spaceType: "아파트", writer: "강**", price: "견적요청" },
  ],
  worker_call: [
    { id: "wc1", workDate: "02.15.", orderStatus: "접수", matchType: "다중", title: "철거 인력 2명 급구", subcategory: "철거인력", description: "인테리어 철거 보조 인력 2명 필요", location: "서울 관악구", schedule: "내일 오전", createdAt: "20분 전", spaceType: "상가", writer: "한**", price: "일당협의" },
  ],
  partial_interior: [
    { id: "pi1", workDate: "02.25.", orderStatus: "접수", matchType: "다중", title: "방 3개 + 거실 도배 요청", subcategory: "도배", description: "실크도배 희망\n천장 포함 전체", location: "서울 동작구", schedule: "2월 말", createdAt: "2시간 전", spaceType: "아파트", writer: "조**", price: "견적요청" },
  ],
  full_remodel: [
    { id: "fr1", workDate: "03.10.", orderStatus: "접수", matchType: "다중", title: "25평 아파트 전체 리모델링", subcategory: "아파트인테리어", description: "25평 구축 아파트 전체 리모델링\n욕실2 주방 거실 방3", location: "서울 구로구", schedule: "3월 중", createdAt: "3시간 전", spaceType: "아파트", writer: "이**", price: "견적요청" },
  ],
  heavy_equipment: [
    { id: "he1", workDate: "02.17.", orderStatus: "접수", matchType: "다중", title: "스카이차 1일 대여", subcategory: "스카이차", description: "외벽 작업용 스카이차 필요\n5층 높이", location: "서울 중구", schedule: "2월 17일", createdAt: "1시간 전", spaceType: "상가", writer: "김**", price: "견적요청" },
  ],
  waste: [
    { id: "ws1", workDate: "02.18.", orderStatus: "지원가능", matchType: "다중", title: "생활폐기물 수거 요청", subcategory: "생활폐기물", description: "이사 후 대형 폐기물 수거", location: "서울 마포구", schedule: "이번 주 내", createdAt: "1시간 전", spaceType: "아파트", writer: "박**", price: "견적요청" },
  ],
  demolition: [
    { id: "dm1", workDate: "02.22.", orderStatus: "접수", matchType: "다중", title: "상가 인테리어 철거", subcategory: "인테리어철거", description: "40평 상가 내부 전체 철거\n바닥, 천장, 벽체 포함", location: "서울 강남구", schedule: "협의가능", createdAt: "2시간 전", spaceType: "상가", writer: "오**", price: "견적요청" },
  ],
  pest_control: [
    { id: "pt1", workDate: "02.14.", orderStatus: "접수", matchType: "다중", title: "바퀴벌레 방역 긴급 요청", subcategory: "바퀴벌레", description: "원룸에 바퀴벌레 대량 발생\n즉시 방역 가능한 분", location: "서울 관악구", schedule: "가능한 빨리", createdAt: "30분 전", spaceType: "원룸", writer: "송**", price: "50,000" },
  ],
  mold: [
    { id: "md1", workDate: "당일", orderStatus: "접수", matchType: "우선", title: "곰팡이제거 재발방지 시공", subcategory: "곰팡이제거+항균코팅", description: "화장실·안방 곰팡이 제거 및 항균코팅", location: "서울 노원구", schedule: "가능한 빨리", createdAt: "15분 전", spaceType: "아파트", writer: "한**", price: "가견적" },
  ],
  auto: [
    { id: "at1", workDate: "02.14.", orderStatus: "접수", matchType: "다중", title: "SUV 출장세차 요청", subcategory: "출장세차", description: "SUV 외부+내부 세차 요청\n지하주차장 가능", location: "서울 서초구", schedule: "이번 주 토요일", createdAt: "1시간 전", spaceType: "기타", writer: "유**", price: "50,000" },
  ],
  moving: [
    { id: "mv1", workDate: "02.15.", orderStatus: "지원가능", matchType: "다중", title: "가정이사 견적 요청드립니다", subcategory: "가정이사", description: "32평 아파트 → 25평 아파트\n짐 양: 보통 / 에어컨 2대 이전 포함", location: "서울 강남구", schedule: "2월 15일 희망", createdAt: "2분 전", spaceType: "아파트", writer: "김**", price: "견적요청" },
    { id: "mv2", workDate: "당일", orderStatus: "접수", matchType: "우선", title: "용달이사 급하게 구합니다!", subcategory: "용달이사", description: "냉장고 1, 세탁기 1, 침대 1, 박스 5개", location: "인천 부평구", schedule: "오늘 중 가능하신 분", createdAt: "5시간 전", spaceType: "빌라", writer: "최**", price: "200,000" },
  ],
  computer: [
    { id: "cp1", workDate: "02.13.", orderStatus: "접수", matchType: "다중", title: "사무실 프린터 수리", subcategory: "프린터수리", description: "레이저 프린터 인쇄 안됨\n출장 수리 요청", location: "서울 종로구", schedule: "가능한 빨리", createdAt: "30분 전", spaceType: "사무실", writer: "권**", price: "견적요청" },
  ],
  inspection: [
    { id: "is1", workDate: "02.20.", orderStatus: "접수", matchType: "다중", title: "신축 아파트 하자점검 대행", subcategory: "하자점검", description: "32평 신축 아파트 사전점검 대행 요청", location: "경기 화성시", schedule: "2월 20일", createdAt: "2시간 전", spaceType: "아파트", writer: "남**", price: "견적요청" },
  ],
  supplies: [
    { id: "sp1", workDate: "02.14.", orderStatus: "접수", matchType: "다중", title: "타일 자재 공급 요청", subcategory: "건축자재", description: "욕실 타일 시공용 자재 일괄 공급 요청", location: "서울 금천구", schedule: "이번 주 내", createdAt: "3시간 전", spaceType: "아파트", writer: "문**", price: "견적요청" },
  ],
  training: [
    { id: "tr1", workDate: "03.01.", orderStatus: "접수", matchType: "다중", title: "에어컨 분해청소 기술 교육", subcategory: "시공기술교육", description: "에어컨 분해청소 실무 기술 배우고 싶습니다", location: "서울 영등포구", schedule: "3월 초", createdAt: "1시간 전", spaceType: "기타", writer: "정**", price: "견적요청" },
  ],
  electrical_work: [
    { id: "ew1", workDate: "02.19.", orderStatus: "접수", matchType: "다중", title: "사무실 전기 증설 공사", subcategory: "전기증설", description: "사무실 확장으로 콘센트 10개소 증설 필요", location: "서울 강남구", schedule: "협의가능", createdAt: "2시간 전", spaceType: "사무실", writer: "백**", price: "견적요청" },
  ],
  realestate: [
    { id: "re1", workDate: "02.20.", orderStatus: "접수", matchType: "다중", title: "강남역 인근 투룸 전세 구합니다", subcategory: "전월세", description: "보증금 2억 이내, 역세권 5분 이내", location: "서울 강남구", schedule: "협의가능", createdAt: "3분 전", spaceType: "아파트", writer: "김**", price: "견적요청" },
  ],
  insurance: [
    { id: "in1", workDate: "02.15.", orderStatus: "접수", matchType: "다중", title: "시공업체 배상책임보험 문의", subcategory: "배상책임보험", description: "인테리어 시공업체 배상책임보험 가입 문의", location: "서울 송파구", schedule: "협의가능", createdAt: "1시간 전", spaceType: "기타", writer: "장**", price: "상담요청" },
  ],
  fortune: [
    { id: "ft1", workDate: "02.14.", orderStatus: "접수", matchType: "다중", title: "이사 택일 상담", subcategory: "택일", description: "3월 중 이사 날짜 택일 상담 요청", location: "서울 중구", schedule: "협의가능", createdAt: "2시간 전", spaceType: "기타", writer: "최**", price: "상담요청" },
  ],
};

/* ─── 오더 상태 라벨 색상 ─── */
const STATUS_STYLE = {
  "접수": { bg: THEME.purpleLight, color: THEME.purple },
  "지원가능": { bg: "#DBEAFE", color: THEME.primary },
  "배차대기": { bg: "#FEF3C7", color: "#B45309" },
  "취소": { bg: "#FEE2E2", color: THEME.danger },
  "완료": { bg: "#D1FAE5", color: THEME.success },
};

const OrderListPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = searchParams.get("category");
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const headerName = category ? `${category.icon} ${category.name}` : "오더 리스트";
  const orders = MOCK_ORDERS[categoryId] || [];

  const handleCardClick = (order) => {
    navigate(`/order/detail/${order.id}`, { state: { order, category } });
  };

  return (
    <SimpleBackLayout NAME={headerName} hideFooter>
      <ListWrap>
        {orders.length === 0 ? (
          <EmptyState>
            <EmptyIcon>{category?.icon || "📋"}</EmptyIcon>
            <EmptyText>
              {category
                ? `아직 ${category.name} 요청이 없습니다.`
                : "등록된 오더가 없습니다."}
              <br />
              새로운 요청이 들어오면 알려드릴게요!
            </EmptyText>
          </EmptyState>
        ) : (
          orders.map((order) => {
            const st = STATUS_STYLE[order.orderStatus] || STATUS_STYLE["접수"];
            return (
              <CardWrap key={order.id} onClick={() => handleCardClick(order)}>
                <CardHeader>
                  <OrderBadge $color={st.bg} $textColor={st.color}>
                    {order.orderStatus}
                  </OrderBadge>
                  <TimeText>{order.createdAt}</TimeText>
                </CardHeader>
                <TagRow>
                  {order.subcategory && <SubTag>{order.subcategory}[{order.matchType}]</SubTag>}
                  {order.spaceType && <SpaceTag>{order.spaceType}</SpaceTag>}
                </TagRow>
                <OrderTitle>{order.title}</OrderTitle>
                <OrderDesc>{order.description}</OrderDesc>
                <BottomRow>
                  <OrderLocation>{order.location}</OrderLocation>
                  <OrderSchedule>{order.price}</OrderSchedule>
                </BottomRow>
              </CardWrap>
            );
          })
        )}
      </ListWrap>
    </SimpleBackLayout>
  );
};

export default OrderListPage;

/* ===================== styles ===================== */

const ListWrap = styled.div`
  padding: 12px 0 20px;
  background: ${THEME.background};
  min-height: 100%;
`;

const CardWrap = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  margin: 0 16px 10px;
  padding: 16px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { transform: scale(0.99); }
  transition: transform 0.1s;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const OrderBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $color }) => $color};
  color: ${({ $textColor }) => $textColor};
`;

const TimeText = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.muted};
`;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
`;

const SubTag = styled.span`
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
`;

const SpaceTag = styled.span`
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const OrderTitle = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.4;
`;

const OrderDesc = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.textSecondary};
  margin-top: 6px;
  line-height: 1.5;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${THEME.border};
`;

const OrderLocation = styled.span`
  font-size: 12px;
  color: ${THEME.muted};
  font-weight: 500;
`;

const OrderSchedule = styled.span`
  font-size: 12px;
  color: ${THEME.primary};
  font-weight: 600;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyText = styled.div`
  font-weight: 600;
  color: ${THEME.muted};
  line-height: 1.6;
  text-align: center;
`;
