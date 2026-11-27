/**
 * 기능 켜고 끄기 — 값 하나로 앱 전체에서 그 기능을 감춘다.
 *
 * INSURANCE_ENABLED (대표 리뷰 2026-11-27 "보험 삭제합니다(초기에는)")
 *   false 면 보험(안심케어)을 앱에서 전부 감춘다 — 하단 탭 · PC 메뉴 · 보험 화면 주소 · 오더 접수/상세/카드의 보험 칸 ·
 *   체크인 전 보험 확인 · 마이 메뉴 · 채팅 분류 · 프로필의 보험 줄.
 *   코드와 데이터(가입 내역 · 관리자 · 보험대리점 관리자)는 그대로 둔다. 다시 열 때는 true 로 바꾸고 배포하면 된다.
 *   PG 심사 계정(users.pgReview)은 이 값과 상관없이 늘 보험을 감춘다(형 2026-10-07).
 */
export const INSURANCE_ENABLED = false;

/** 이 회원에게 보험을 감춰야 하나 */
export const insuranceHidden = (userData) => !INSURANCE_ENABLED || userData?.pgReview === true;
