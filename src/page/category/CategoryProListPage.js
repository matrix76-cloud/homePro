/* eslint-disable */
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import {
  IoLocationOutline,
  IoStar,
  IoImageOutline,
  IoPersonCircleOutline,
  IoChevronForward,
} from "react-icons/io5";

/* ─── 플레이스홀더 색상 ─── */
const PH_COLORS = [
  "linear-gradient(135deg, #DBEAFE 0%, #93C5FD 100%)",
  "linear-gradient(135deg, #EDE9FE 0%, #C4B5FD 100%)",
  "linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%)",
  "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)",
  "linear-gradient(135deg, #FCE7F3 0%, #F9A8D4 100%)",
  "linear-gradient(135deg, #E0E7FF 0%, #A5B4FC 100%)",
];

/* ─── 전문가(사업자)가 등록한 서비스 목업 ─── */
const MOCK_SERVICES = {
  /* 1. 구해줘 부동산 */
  realestate: [
    { id: "s1", proName: "강남부동산 강공인", proImg: null, title: "강남·서초 아파트 매매 전문", description: "급매물 실시간 업데이트! 18년 경력으로 안전한 거래를 도와드립니다. 등기부등본 분석, 시세 상담 무료", photoCount: 5, location: "서울 강남구", rating: 4.9, reviews: 312, career: "18년", price: "상담 무료", tags: ["아파트 매매", "급매물", "시세 상담"] },
    { id: "s2", proName: "서부장 공인중개사", proImg: null, title: "전월세 전문! 보증금 안전 거래", description: "보증금 안전 확인부터 등기부등본 꼼꼼 분석까지. 전세사기 예방 체크리스트 무료 제공", photoCount: 3, location: "서울 서초구", rating: 4.8, reviews: 187, career: "12년", price: "중개수수료 협의", tags: ["전월세", "보증금 안전", "전세사기 예방"] },
    { id: "s3", proName: "한실장 부동산", proImg: null, title: "역세권 원룸·오피스텔 매물 다수", description: "대학가·역세권 원룸 보유. 즉시 입주 가능 매물 상시 업데이트. 풀옵션 위주", photoCount: 8, location: "서울 관악구", rating: 4.7, reviews: 94, career: "7년", price: "상담 무료", tags: ["원룸", "오피스텔", "즉시입주"] },
    { id: "s4", proName: "오대표 상가전문", proImg: null, title: "상가·사무실 임대 권리금 협상", description: "상가·사무실 임대 전문. 권리금 협상 노하우 15년. 상권분석 리포트 무료 제공", photoCount: 4, location: "서울 강남구", rating: 4.8, reviews: 156, career: "15년", price: "상담 무료", tags: ["상가", "사무실", "권리금"] },
    { id: "s5", proName: "윤팀장 분양컨설팅", proImg: null, title: "신축 아파트 분양·청약 전략 상담", description: "판교·분당·위례 신축 분양 정보. 청약 전략 수립, 자금 계획 컨설팅", photoCount: 2, location: "경기 성남시", rating: 4.6, reviews: 73, career: "10년", price: "초기상담 무료", tags: ["신축분양", "청약", "컨설팅"] },
  ],
  /* 2. 이사 */
  moving: [
    { id: "sm1", proName: "김대표 이사전문", proImg: null, title: "가정이사 포장이사 전문 · 파손 100% 보상", description: "꼼꼼한 포장, 안전한 운반. 에어컨 이전설치 포함. 15년 경력 팀 직영", photoCount: 6, location: "서울 전지역", rating: 4.9, reviews: 127, career: "15년", price: "견적 무료", tags: ["가정이사", "포장이사", "에어컨"] },
    { id: "sm2", proName: "빠른이사 이사장", proImg: null, title: "원룸·투룸 이사 당일 가능!", description: "원룸·투룸 전문. 당일이사 OK. 소량이사도 환영합니다", photoCount: 3, location: "서울·경기", rating: 4.8, reviews: 89, career: "8년", price: "15만원~", tags: ["원룸이사", "당일이사", "소량이사"] },
    { id: "sm3", proName: "프로무브 박사장", proImg: null, title: "사무실·기업 이전 전문 IT장비 안전이송", description: "기업·사무실 이전 전문. 컴퓨터·서버 장비 안전 포장. 주말 야간 작업 가능", photoCount: 5, location: "수도권 전지역", rating: 4.7, reviews: 64, career: "12년", price: "현장견적 무료", tags: ["사무실이사", "기업이전", "IT장비"] },
    { id: "sm4", proName: "용달왕 최프로", proImg: null, title: "용달이사 최저가 · 빠른 배차", description: "소량이사·용달 최저가 보장. 1톤~5톤 다양한 차량 보유. 즉시 배차 가능", photoCount: 4, location: "수도권", rating: 4.6, reviews: 203, career: "20년", price: "8만원~", tags: ["용달이사", "소량이사", "즉시배차"] },
  ],
  /* 3. 홈클리닝 */
  cleaning: [
    { id: "sc1", proName: "클린홈 김사장", proImg: null, title: "입주·이사청소 전문 · 베란다 포함", description: "신축 입주청소, 이사청소 전문. 베란다·발코니 포함 올인원 패키지", photoCount: 7, location: "서울 전지역", rating: 4.9, reviews: 234, career: "10년", price: "평당 2만원~", tags: ["입주청소", "이사청소", "베란다"] },
    { id: "sc2", proName: "새집클린 이대표", proImg: null, title: "거주청소 · 정리수납 전문", description: "거주 중 청소, 정리수납 서비스. 주방·욕실 집중 클리닝. 정기 청소 할인", photoCount: 5, location: "서울·경기", rating: 4.8, reviews: 156, career: "7년", price: "10만원~", tags: ["거주청소", "정리수납", "정기청소"] },
    { id: "sc3", proName: "펫클린 박프로", proImg: null, title: "펫홈클리닝 · 반려동물 특화 청소", description: "반려동물 가정 전문 청소. 털·냄새·진드기 제거. 친환경 세정제 사용", photoCount: 4, location: "서울 전지역", rating: 4.7, reviews: 87, career: "5년", price: "15만원~", tags: ["펫클리닝", "반려동물", "친환경"] },
  ],
  /* 4. 가전청소 */
  appliance_cleaning: [
    { id: "sac1", proName: "에어컨닥터 정프로", proImg: null, title: "에어컨 분해청소 전문 · 벽걸이/스탠드/시스템", description: "에어컨 완전 분해세척. 벽걸이·스탠드·천장형 모두 가능. 항균 코팅 포함", photoCount: 6, location: "서울·경기", rating: 4.9, reviews: 421, career: "12년", price: "벽걸이 5만원~", tags: ["에어컨청소", "분해세척", "항균코팅"] },
    { id: "sac2", proName: "세탁기마스터 한대표", proImg: null, title: "세탁기 분해청소 · 통돌이/드럼", description: "세탁기 완전 분해 후 내부 세척. 곰팡이·세균 99.9% 제거. 드럼·통돌이 모두 가능", photoCount: 5, location: "수도권", rating: 4.8, reviews: 198, career: "8년", price: "통돌이 7만원~", tags: ["세탁기청소", "분해세척", "곰팡이제거"] },
    { id: "sac3", proName: "주방클린 오사장", proImg: null, title: "주방후드·냉장고 청소 전문", description: "주방후드 기름때 완벽 제거, 냉장고 내부·외부 전체 청소. 세트 할인 가능", photoCount: 3, location: "서울 전지역", rating: 4.7, reviews: 112, career: "6년", price: "후드 4만원~", tags: ["주방후드", "냉장고청소", "기름때"] },
  ],
  /* 5. 침대매트리스 */
  mattress: [
    { id: "smt1", proName: "매트리스케어 윤프로", proImg: null, title: "침대매트리스 살균세척 · 진드기 제거", description: "UV살균 + 스팀세척 + 진드기 흡입. 아토피·알레르기 걱정 해결. 당일 사용 가능", photoCount: 5, location: "서울·경기", rating: 4.9, reviews: 267, career: "9년", price: "싱글 5만원~", tags: ["매트리스세척", "진드기제거", "UV살균"] },
    { id: "smt2", proName: "소파클린 강대표", proImg: null, title: "소파·카펫 전문 청소 · 가죽/패브릭", description: "가죽소파 크리닝, 패브릭소파 스팀세척, 카펫 딥클리닝. 냄새 제거 포함", photoCount: 4, location: "서울 전지역", rating: 4.8, reviews: 143, career: "7년", price: "소파 8만원~", tags: ["소파청소", "카펫청소", "가죽크리닝"] },
  ],
  /* 6. 특수청소 */
  special_cleaning: [
    { id: "ssp1", proName: "특수클린 이팀장", proImg: null, title: "유품정리·고독사 현장 전문 청소", description: "유품정리, 고독사 현장 복원 전문. 소독·방역 포함. 유가족 배려 서비스", photoCount: 3, location: "수도권 전지역", rating: 4.9, reviews: 89, career: "15년", price: "현장견적", tags: ["유품정리", "고독사", "현장복원"] },
    { id: "ssp2", proName: "클린119 박대표", proImg: null, title: "화재현장·쓰레기집 전문 복원", description: "화재 후 그을음·냄새 제거, 쓰레기집 정리·소독. 폐기물 처리까지 원스톱", photoCount: 5, location: "전국", rating: 4.8, reviews: 67, career: "12년", price: "현장견적", tags: ["화재청소", "쓰레기집", "원스톱"] },
    { id: "ssp3", proName: "바이오클린 최프로", proImg: null, title: "혈흔·범죄현장·감염관리 청소", description: "사고현장 혈흔 제거, 병원·요양시설 감염관리 청소. 전문 장비·약품 사용", photoCount: 2, location: "수도권", rating: 4.7, reviews: 45, career: "10년", price: "현장견적", tags: ["혈흔제거", "감염관리", "전문장비"] },
  ],
  /* 7. 사업장청소 */
  business_cleaning: [
    { id: "sbc1", proName: "비즈클린 장대표", proImg: null, title: "사무실·상가 정기청소 전문", description: "사무실, 매장, 상가 정기·수시 청소. 야간·주말 작업 가능. 단체계약 할인", photoCount: 4, location: "서울 전지역", rating: 4.8, reviews: 178, career: "11년", price: "평당 1.5만원~", tags: ["사무실청소", "상가청소", "정기청소"] },
    { id: "sbc2", proName: "푸드클린 김사장", proImg: null, title: "음식점·주방 위생청소 전문", description: "음식점 주방 기름때 제거, 배기구·덕트 청소. HACCP 기준 위생관리", photoCount: 6, location: "수도권", rating: 4.9, reviews: 134, career: "13년", price: "현장견적", tags: ["음식점청소", "주방청소", "위생관리"] },
    { id: "sbc3", proName: "산업클린 오팀장", proImg: null, title: "공장·창고 대형 청소 전문", description: "공장 바닥세척, 창고 먼지 제거, 준공·철거 후 청소. 대형 장비 보유", photoCount: 3, location: "전국", rating: 4.7, reviews: 56, career: "9년", price: "현장견적", tags: ["공장청소", "창고청소", "대형장비"] },
  ],
  /* 8. 구인(작업자호출) */
  worker_call: [
    { id: "swc1", proName: "인력뱅크 이대표", proImg: null, title: "일용직 전문인력 즉시 파견", description: "이사보조, 짐정리, 단순노무 등. 당일 배치 가능. 근로계약서 작성", photoCount: 2, location: "수도권", rating: 4.7, reviews: 312, career: "14년", price: "일당 12만원~", tags: ["일용직", "즉시파견", "당일배치"] },
    { id: "swc2", proName: "기술인력 박프로", proImg: null, title: "전문기술자 파견 · 용접/배관/전기", description: "용접, 배관, 전기 등 기술인력 파견. 자격증 보유 인력만 매칭", photoCount: 3, location: "전국", rating: 4.8, reviews: 89, career: "10년", price: "일당 18만원~", tags: ["전문기술자", "용접", "배관"] },
  ],
  /* 9. 해충방역 */
  pest_control: [
    { id: "spc1", proName: "해충제로 김박사", proImg: null, title: "바퀴벌레·개미 완전 박멸", description: "바퀴벌레, 개미 전문 방역. 겔·분무·훈증 병행 시공. 재발 시 무상 재시공", photoCount: 4, location: "서울·경기", rating: 4.9, reviews: 356, career: "16년", price: "원룸 3만원~", tags: ["바퀴벌레", "개미", "재발보장"] },
    { id: "spc2", proName: "빈대119 정대표", proImg: null, title: "빈대·쥐 전문 방역 · 스팀열처리", description: "빈대 스팀열처리 + 약제 병행. 쥐 퇴치 및 침입경로 차단. 100% 퇴치 보장", photoCount: 5, location: "수도권", rating: 4.8, reviews: 198, career: "11년", price: "현장견적", tags: ["빈대", "쥐", "열처리"] },
    { id: "spc3", proName: "그린방역 오사장", proImg: null, title: "정기방역·살균소독 전문", description: "가정·사업장 정기방역. 살균·소독 서비스. 친환경 약제 사용. 벌집 제거 가능", photoCount: 3, location: "서울 전지역", rating: 4.7, reviews: 124, career: "8년", price: "월 5만원~", tags: ["정기방역", "살균소독", "벌집제거"] },
  ],
  /* 10. 가전설치수리 */
  appliance_install: [
    { id: "sai1", proName: "에어컨프로 최기사", proImg: null, title: "에어컨 설치·이전·수리 전문", description: "벽걸이·스탠드·시스템 에어컨 설치, 이전설치, 고장수리. 냉매 충전 포함", photoCount: 5, location: "서울·경기", rating: 4.9, reviews: 287, career: "18년", price: "설치 5만원~", tags: ["에어컨설치", "이전설치", "냉매충전"] },
    { id: "sai2", proName: "가전마스터 한기사", proImg: null, title: "세탁기·냉장고·TV 설치수리", description: "세탁기, 냉장고, TV 벽걸이 설치 및 고장 수리. 당일 출장 가능", photoCount: 4, location: "수도권", rating: 4.8, reviews: 165, career: "12년", price: "출장비 2만원~", tags: ["세탁기", "냉장고", "TV벽걸이"] },
    { id: "sai3", proName: "스마트홈 정대표", proImg: null, title: "비데·정수기·인덕션 설치 전문", description: "비데, 정수기, 인덕션, 후드 설치·교체. CCTV·네트워크 설치도 가능", photoCount: 3, location: "서울 전지역", rating: 4.7, reviews: 98, career: "9년", price: "설치 3만원~", tags: ["비데", "정수기", "CCTV"] },
  ],
  /* 11. 전기고장 */
  electrical: [
    { id: "sel1", proName: "전기달인 박기사", proImg: null, title: "전원·차단기·누전 즉시 출장수리", description: "갑자기 전기가 나갔을 때! 차단기 트립, 누전, 과부하 원인 진단 및 즉시 수리", photoCount: 3, location: "서울·경기", rating: 4.9, reviews: 245, career: "20년", price: "출장비 3만원~", tags: ["차단기", "누전", "즉시출장"] },
    { id: "sel2", proName: "라이트프로 김기사", proImg: null, title: "콘센트·스위치·조명 교체수리", description: "콘센트 고장, 스위치 교체, 조명 설치·교체. LED 전환 공사 가능", photoCount: 4, location: "수도권", rating: 4.8, reviews: 167, career: "14년", price: "건당 2만원~", tags: ["콘센트", "스위치", "조명교체"] },
    { id: "sel3", proName: "파워텍 이대표", proImg: null, title: "전기증설·배선공사 전문", description: "콘센트 증설, 전용회로 설치, 배선 재공사. 사업장 전기공사도 가능", photoCount: 2, location: "전국", rating: 4.7, reviews: 89, career: "16년", price: "현장견적", tags: ["전기증설", "배선공사", "사업장"] },
  ],
  /* 12. 인테리어/시공 */
  interior: [
    { id: "sin1", proName: "디자인홈 김실장", proImg: null, title: "아파트 인테리어 · 3D 디자인 무료", description: "아파트 전체·부분 인테리어. 3D 시뮬레이션 무료 제공. 시공 후 하자보수 2년", photoCount: 8, location: "서울·경기", rating: 4.9, reviews: 198, career: "15년", price: "평당 견적", tags: ["아파트인테리어", "3D디자인", "하자보수"] },
    { id: "sin2", proName: "리모델링왕 박대표", proImg: null, title: "주택 리모델링 · 구조변경 가능", description: "단독주택, 빌라 전체 리모델링. 구조변경, 증축 상담. 인허가 대행", photoCount: 6, location: "수도권", rating: 4.8, reviews: 134, career: "20년", price: "현장견적", tags: ["주택리모델링", "구조변경", "인허가"] },
    { id: "sin3", proName: "상가인테리어 오팀장", proImg: null, title: "상업공간 인테리어 · 카페/음식점/사무실", description: "카페, 음식점, 사무실 등 상업공간 전문. 컨셉 기획부터 시공까지 올인원", photoCount: 7, location: "전국", rating: 4.8, reviews: 87, career: "12년", price: "현장견적", tags: ["상업공간", "카페인테리어", "올인원"] },
  ],
  /* 13. 곰팡이결로방지 */
  mold: [
    { id: "smd1", proName: "곰팡이제로 한박사", proImg: null, title: "곰팡이 제거 + 항균코팅 전문", description: "벽면·천장 곰팡이 완벽 제거 후 항균코팅. 재발 방지 보장. 친환경 약제 사용", photoCount: 5, location: "서울·경기", rating: 4.9, reviews: 213, career: "13년", price: "평당 3만원~", tags: ["곰팡이제거", "항균코팅", "재발방지"] },
    { id: "smd2", proName: "결로방지 김프로", proImg: null, title: "결로방지 단열 시공 전문", description: "결로 원인 진단, 단열페인트·단열재 시공. 창문 단열 시공 가능. 결로 완화 보장", photoCount: 4, location: "수도권", rating: 4.8, reviews: 98, career: "10년", price: "현장견적", tags: ["결로방지", "단열시공", "단열페인트"] },
  ],
  /* 14. 욕실주방창호타일 */
  bathroom_kitchen: [
    { id: "sbk1", proName: "욕실마스터 정기사", proImg: null, title: "욕실 리모델링 · 부분수리 전문", description: "욕실 전체 리모델링, 세면대·변기·샤워부스 교체. 방수 시공 포함", photoCount: 6, location: "서울·경기", rating: 4.9, reviews: 187, career: "17년", price: "현장견적", tags: ["욕실리모델링", "부분수리", "방수시공"] },
    { id: "sbk2", proName: "주방리폼 이대표", proImg: null, title: "주방 싱크대·상판 교체 전문", description: "싱크대 교체, 상판(인조대리석·포세린) 시공. 주방 부분 리모델링 가능", photoCount: 5, location: "수도권", rating: 4.8, reviews: 134, career: "14년", price: "싱크대 80만원~", tags: ["싱크대교체", "상판시공", "주방리폼"] },
    { id: "sbk3", proName: "타일프로 최기사", proImg: null, title: "타일시공·창호교체 전문", description: "욕실·주방·현관 타일 시공, 창호(샤시) 교체. 줄눈 시공 포함", photoCount: 4, location: "서울 전지역", rating: 4.7, reviews: 76, career: "11년", price: "평당 견적", tags: ["타일시공", "창호교체", "줄눈"] },
  ],
  /* 15. 보일러난방 */
  boiler: [
    { id: "sbl1", proName: "보일러119 김기사", proImg: null, title: "보일러 고장수리 · 당일 출장", description: "보일러 안 켜짐, 이상소음, 온수 안 나옴 등. 모든 브랜드 수리 가능. 당일 출장", photoCount: 3, location: "서울·경기", rating: 4.9, reviews: 345, career: "22년", price: "출장비 3만원~", tags: ["보일러수리", "당일출장", "모든브랜드"] },
    { id: "sbl2", proName: "난방프로 박대표", proImg: null, title: "보일러 교체 · 경동/귀뚜라미/린나이", description: "보일러 교체 설치 전문. 경동, 귀뚜라미, 린나이 등 전 브랜드. 철거비 포함", photoCount: 4, location: "수도권", rating: 4.8, reviews: 167, career: "15년", price: "교체 50만원~", tags: ["보일러교체", "설치", "전브랜드"] },
    { id: "sbl3", proName: "온돌마스터 이기사", proImg: null, title: "난방배관·에어빼기·바닥난방 수리", description: "난방배관 에어 제거, 바닥난방 배관 수리, 기름보일러 청소. 점검 서비스 포함", photoCount: 2, location: "서울 전지역", rating: 4.7, reviews: 89, career: "12년", price: "건당 5만원~", tags: ["난방배관", "에어빼기", "기름보일러"] },
  ],
  /* 16. 누수/배관 */
  leak_pipe: [
    { id: "slp1", proName: "누수탐지 장프로", proImg: null, title: "배관누수 정밀탐지 · 비파괴 수리", description: "열화상 카메라, 음향탐지기로 정밀 누수 탐지. 비파괴 수리 가능. 원인 리포트 제공", photoCount: 5, location: "서울·경기", rating: 4.9, reviews: 278, career: "18년", price: "탐지비 5만원~", tags: ["누수탐지", "비파괴", "열화상"] },
    { id: "slp2", proName: "배관닥터 오기사", proImg: null, title: "막힌 배관 뚫기 · 싱크대/변기/하수구", description: "싱크대, 변기, 세면대, 하수구 막힘 즉시 해결. 고압세척, 스프링 작업", photoCount: 3, location: "수도권", rating: 4.8, reviews: 412, career: "16년", price: "3만원~", tags: ["배관막힘", "변기막힘", "고압세척"] },
    { id: "slp3", proName: "배관수리 한대표", proImg: null, title: "배관 파손·동파 수리 전문", description: "동파 배관 수리, 노후 배관 교체, 하수구 악취 역류 방지. 24시간 긴급 출장", photoCount: 4, location: "전국", rating: 4.7, reviews: 134, career: "14년", price: "현장견적", tags: ["동파수리", "배관교체", "24시긴급"] },
  ],
  /* 17. 방수공사 */
  waterproof: [
    { id: "swp1", proName: "방수마스터 김대표", proImg: null, title: "욕실·베란다·옥상 방수 전문", description: "욕실 누수 방수, 베란다·옥상 우레탄 방수. 시공 후 5년 하자보증", photoCount: 5, location: "서울·경기", rating: 4.9, reviews: 198, career: "19년", price: "욕실 30만원~", tags: ["욕실방수", "옥상방수", "하자보증"] },
    { id: "swp2", proName: "외벽방수 정프로", proImg: null, title: "외벽 방수·실리콘 재시공", description: "외벽 크랙 방수, 창문 실리콘 재시공. 누수 원인 진단 후 맞춤 시공", photoCount: 4, location: "수도권", rating: 4.8, reviews: 87, career: "13년", price: "현장견적", tags: ["외벽방수", "실리콘", "크랙보수"] },
  ],
  /* 18. 도배/문짝 */
  wallpaper_door: [
    { id: "swd1", proName: "도배왕 이사장", proImg: null, title: "실크도배 · 합지도배 전문", description: "실크, 합지, 수입벽지 도배 전문. 곰팡이 방지 도배도 가능. 깔끔한 마무리", photoCount: 5, location: "서울·경기", rating: 4.9, reviews: 267, career: "25년", price: "평당 2만원~", tags: ["실크도배", "합지도배", "수입벽지"] },
    { id: "swd2", proName: "장판프로 최기사", proImg: null, title: "장판·마루 시공 전문", description: "장판 교체, 강화마루·강마루 시공. 기존 바닥 철거 포함. 당일 시공 가능", photoCount: 4, location: "수도권", rating: 4.8, reviews: 145, career: "15년", price: "평당 1.5만원~", tags: ["장판", "강화마루", "당일시공"] },
    { id: "swd3", proName: "도어마스터 한기사", proImg: null, title: "문짝 교체·도어락 설치 전문", description: "방문, 현관문, ABS도어 교체. 디지털 도어락 설치·교체. 당일 시공", photoCount: 3, location: "서울 전지역", rating: 4.7, reviews: 98, career: "10년", price: "문짝 15만원~", tags: ["문짝교체", "도어락", "현관문"] },
  ],
  /* 19. 외부시공 */
  exterior: [
    { id: "sex1", proName: "외벽프로 강대표", proImg: null, title: "외벽 페인트·균열 보수 전문", description: "외벽 페인트 도장, 균열 보수, 외벽 방수. 비계·곤도라 작업 가능", photoCount: 5, location: "수도권", rating: 4.8, reviews: 123, career: "17년", price: "현장견적", tags: ["외벽페인트", "균열보수", "비계작업"] },
    { id: "sex2", proName: "지붕수리 박팀장", proImg: null, title: "지붕 보수·방수·교체 전문", description: "슬레이트, 기와, 금속지붕 보수·교체. 지붕 방수 시공. 빗물 누수 해결", photoCount: 4, location: "전국", rating: 4.7, reviews: 87, career: "20년", price: "현장견적", tags: ["지붕보수", "지붕방수", "슬레이트"] },
    { id: "sex3", proName: "데크마스터 이사장", proImg: null, title: "데크·담장·울타리 시공 전문", description: "방부목·합성목 데크 설치, 담장·울타리 시공. 도장 보수 작업도 가능", photoCount: 6, location: "수도권", rating: 4.8, reviews: 67, career: "12년", price: "현장견적", tags: ["데크시공", "담장", "방부목"] },
  ],
  /* 20. 폐기물/철거 */
  waste_demolition: [
    { id: "swd_1", proName: "폐기물119 김사장", proImg: null, title: "생활폐기물·대형폐기물 수거 전문", description: "가구, 가전, 생활쓰레기 수거·처리. 당일 수거 가능. 분리배출 대행", photoCount: 3, location: "서울·경기", rating: 4.8, reviews: 234, career: "10년", price: "1톤 15만원~", tags: ["생활폐기물", "대형폐기물", "당일수거"] },
    { id: "swd_2", proName: "철거왕 박대표", proImg: null, title: "인테리어 철거·구조물 해체 전문", description: "아파트·상가 인테리어 철거, 구조물 해체. 석면 처리 가능. 폐기물 반출 포함", photoCount: 5, location: "수도권", rating: 4.9, reviews: 156, career: "18년", price: "현장견적", tags: ["인테리어철거", "구조물해체", "석면처리"] },
    { id: "swd_3", proName: "산업폐기물 오대표", proImg: null, title: "사업장·특수 폐기물 처리 전문", description: "사업장 폐기물, 건설폐기물, 특수폐기물 수거·운반·처리. 인허가 업체", photoCount: 2, location: "전국", rating: 4.7, reviews: 78, career: "15년", price: "현장견적", tags: ["사업장폐기물", "건설폐기물", "인허가"] },
  ],
};

/* ─── 정렬 옵션 ─── */
const SORT_OPTIONS = [
  { key: "rating", label: "평점순" },
  { key: "reviews", label: "리뷰순" },
  { key: "career", label: "경력순" },
];

const CategoryProListPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [sort, setSort] = useState("rating");

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const catName = category ? category.name : "카테고리";
  const services = MOCK_SERVICES[categoryId] || [];

  const handleCardClick = (service) => {
    // 서비스 상세 페이지로 이동 (서비스 데이터를 state로 전달)
    navigate(`/service/${categoryId}/${service.id}`, { state: { service, category } });
  };

  const headerRequestBtn = (
    <HeaderReqBtn onClick={() => navigate(`/order/create/${categoryId}`)}>
      요청하기
    </HeaderReqBtn>
  );

  return (
    <SimpleBackLayout NAME={catName} hideFooter rightAction={headerRequestBtn}>
      <PageWrap>
        {/* 카테고리 헤더 */}
        {category && (
          <CatHeader>
            <CatIconWrap>{category.shortName.charAt(0)}</CatIconWrap>
            <CatInfo>
              <CatName>{category.name}</CatName>
              <CatDesc>{category.description}</CatDesc>
            </CatInfo>
          </CatHeader>
        )}

        {/* 정렬 + 건수 */}
        <FilterBar>
          <ServiceCount>전문가 {services.length}명</ServiceCount>
          <SortRow>
            {SORT_OPTIONS.map((opt) => (
              <SortBtn key={opt.key} $active={sort === opt.key} onClick={() => setSort(opt.key)}>
                {opt.label}
              </SortBtn>
            ))}
          </SortRow>
        </FilterBar>

        {/* 서비스 카드 리스트 */}
        {services.length > 0 ? (
          services.map((svc, idx) => (
            <ServiceCard key={svc.id} onClick={() => handleCardClick(svc)}>
              {/* 상단 전체 사진 영역 */}
              <PhotoArea $bg={PH_COLORS[idx % PH_COLORS.length]}>
                <PhotoPlaceholder>
                  <IoImageOutline size={40} color="rgba(255,255,255,0.5)" />
                  {svc.photoCount > 0 && (
                    <PhotoBadge>사진 {svc.photoCount}장</PhotoBadge>
                  )}
                </PhotoPlaceholder>
              </PhotoArea>

              {/* 본문 */}
              <CardBody>
                {/* 전문가 정보 */}
                <ProRow>
                  <ProAvatar>
                    <IoPersonCircleOutline size={32} color={THEME.muted} />
                  </ProAvatar>
                  <ProInfo>
                    <ProName>{svc.proName}</ProName>
                    <ProMeta>경력 {svc.career} · {svc.location}</ProMeta>
                  </ProInfo>
                  <RatingWrap>
                    <IoStar size={14} color={THEME.accent} />
                    <RatingText>{svc.rating}</RatingText>
                    <ReviewCount>({svc.reviews})</ReviewCount>
                  </RatingWrap>
                </ProRow>

                {/* 서비스 제목 */}
                <ServiceTitle>{svc.title}</ServiceTitle>
                <ServiceDesc>{svc.description}</ServiceDesc>

                {/* 태그 */}
                <TagRow>
                  {svc.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </TagRow>

                {/* 하단 */}
                <BottomRow>
                  <PriceText>{svc.price}</PriceText>
                  <DetailBtn>
                    상세보기 <IoChevronForward size={14} />
                  </DetailBtn>
                </BottomRow>
              </CardBody>
            </ServiceCard>
          ))
        ) : (
          <EmptyWrap>
            <EmptyIcon>{category?.shortName?.charAt(0) || "?"}</EmptyIcon>
            <EmptyTitle>아직 등록된 전문가가 없어요</EmptyTitle>
            <EmptyDesc>곧 전문가들이 등록할 예정이에요!</EmptyDesc>
          </EmptyWrap>
        )}

        <BottomSpacer />
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default CategoryProListPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding: 0 0 12px;
`;

const CatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  background: ${THEME.surface};
`;

const CatIconWrap = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.primary};
  width: 52px;
  height: 52px;
  border-radius: 4px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const CatInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CatName = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const CatDesc = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 4px;
  line-height: 1.4;
`;

/* 필터 바 */
const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  border-bottom: 1px solid ${THEME.border};
`;

const ServiceCount = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
`;

const SortRow = styled.div`
  display: flex;
  gap: 4px;
`;

const SortBtn = styled.button`
  padding: 5px 10px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? "700" : "500")};
  font-family: inherit;
  background: ${({ $active }) => ($active ? THEME.primary : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

/* 서비스 카드 */
const ServiceCard = styled.div`
  background: ${THEME.surface};
  border-radius: 4px;
  margin: 10px 12px;
  overflow: hidden;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { transform: scale(0.99); }
  transition: transform 0.1s;
`;

/* 사진 영역 */
const PhotoArea = styled.div`
  width: 100%;
  height: 180px;
  background: ${({ $bg }) => $bg};
  position: relative;
`;

const PhotoPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const PhotoBadge = styled.div`
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255,255,255,0.7);
  font-size: 12px;
  font-weight: 600;
  color: rgba(0,0,0,0.5);
`;

/* 본문 */
const CardBody = styled.div`
  padding: 16px;
`;

const ProRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const ProAvatar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const ProInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ProMeta = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 1px;
`;

const RatingWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
`;

const RatingText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ReviewCount = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.muted};
`;

const ServiceTitle = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.4;
`;

const ServiceDesc = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.textSecondary};
  margin-top: 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
`;

const Tag = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid ${THEME.border};
`;

const PriceText = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: ${THEME.primary};
`;

const DetailBtn = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.muted};
`;

/* 빈 상태 */
const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px 40px;
`;

const EmptyIcon = styled.div`
  font-size: 56px;
  margin-bottom: 20px;
`;

const EmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const EmptyDesc = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 8px;
`;

/* 헤더 요청 버튼 */
const HeaderReqBtn = styled.button`
  padding: 7px 14px;
  border-radius: 8px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const BottomSpacer = styled.div`
  height: 24px;
`;
