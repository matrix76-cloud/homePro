# 홈프로 보험(도급배상책임보험) 개발 사양 — 2026-09-13 형 확정

> 대표 8/20 기획을 그대로 만든다. 보험료는 대표가 아직 안 줘서 **임시값**으로 넣고 관리자 설정에서 바꾸게 한다.
> 보장 한도·자기부담금 문구는 대표가 주면 넣는다(자리만). 결제는 토스페이먼츠(계약 9/14 예정 — 그 전엔 문서 테스트 키).
> 원칙(전역): 이모지 금지, 좌측 accent bar 금지, 뱃지(연배경+진글씨 pill) 금지, 보라 금지, 글씨 본문 15px 이상, 버튼 radius 10px, 카드 16px(앱 기존 스타일 따름).

## 1. 가입 유형 (대표 확정)
| key | 이름 | 임시 보험료 | 결제 | 유효기간 |
|---|---|---|---|---|
| `yearly` | 1년 단체보험 | 110,000원(부가세 포함) | 토스 일반결제 1회 | 결제일 +1년 |
| `monthly` | 월 구독형 보험 | 11,000원/월 | 토스 빌링키 자동결제, 매월 갱신 | 결제일 +1개월, 자동 연장 |
| `perOrder` | 건당 단기보험 | 시공·단가 금액의 1% (최소 3,000원) | 토스 일반결제, 오더별 | 그 오더의 체크인~체크아웃 |

- 회원이면 구독 여부와 무관하게 가입 가능.
- 효력 조건: 체크인~체크아웃 기록이 서버에 있어야 보장. 매칭 오더·셀프 등록 오더 모두.
- **결제 기록 없으면 체크인 불가**(서버·클라이언트 양쪽 잠금). 월·1년 가입자는 추가 결제 없이 "보험 적용 안내"만.
- 현장견적·견적요청(금액 미정)은 금액이 확정되는 순간 1%를 계산해 결제창.

## 2. Firestore 구조
### `settings/insurance` (관리자가 편집)
```js
{
  plans: {
    yearly:   { label: "1년 단체보험", price: 110000, active: true },
    monthly:  { label: "월 구독형 보험", price: 11000, active: true },
    perOrder: { label: "건당 단기보험", rate: 1, minPrice: 3000, active: true },
  },
  coverage: { maxText: "", deductibleText: "", items: ["작업 중 고객 재물 파손 배상", "작업 중 대인 피해 배상"] }, // 대표 확정 전엔 빈칸 허용
  agencyContacts: [{ name: "", phone: "" }],   // 사고 접수 시 알림 받을 대리점 담당자
  updatedAt,
}
```
### `insurance_policies/{policyId}` — 가입 1건
```js
{
  uid, userName, userPhone,
  type: "yearly" | "monthly" | "perOrder",
  status: "active" | "expired" | "canceled" | "pending",   // pending = 결제 전
  price,                       // 실제 결제 금액
  startAt, endAt,              // Timestamp. monthly는 매 갱신마다 endAt 연장
  paymentId,                   // payments 문서 id (마지막 결제)
  orderId: null | string,      // perOrder 만
  billing: { billingKey, customerKey, cardCompany, cardNumberMasked, nextChargeAt, failCount } | null, // monthly 만
  identity: { verified: bool, method: "phone"|"none", verifiedAt } ,   // 본인인증 자리 (CP사 연동 전엔 이름·전화 확인으로 대체)
  createdAt, updatedAt, canceledAt,
}
```
### `payments/{tossOrderId}` — 토스 결제 1건 (스카이링크와 같은 구조 + purpose)
```js
{
  purpose: "insurance_yearly" | "insurance_monthly" | "insurance_order" | "subscription",
  uid, authUid, amount, status: "ready"|"done"|"fail"|"refund",
  tossOrderId, orderName, paymentKey, tossMethod, approvedAt, receiptUrl, raw,
  meta: { policyId, orderId, planType },
  failCode, failMessage, createdAt, updatedAt,
}
```
- tossOrderId 규칙: `hp_<purpose짧게>_<참조id>_<base36 시각>` (예 `hp_ins_y_<uid앞8>_<t>`, `hp_ins_o_<orderId>_<t>`).
### `insurance_claims/{claimId}` — 사고 접수
```js
{ uid, userName, userPhone, orderId, policyId, occurredAt, place, description, damageLevel: "minor"|"major"|"injury", photos: [url], status: "received"|"in_progress"|"done", agencyMemo, handledBy, createdAt, updatedAt }
```
### `insurance_admin_logs/{id}` — 엑셀 다운로드·마스킹 해제 로그 (필수)
```js
{ adminUid, adminName, action: "excel_download" | "unmask", tab, target, rows, at }
```
### `users/{uid}` 요약 필드(배지용, 서비스가 갱신)
```js
insurance: { type, status, endAt, policyId }        // 가장 최근 유효 가입
insuranceAdmin: true                                 // 보험대리점 관리자 권한 (운영자와 분리)
```
### `homepro_orders/{orderId}` 추가 필드
```js
insurance: { applied: bool, type: "yearly"|"monthly"|"perOrder"|null, policyId, paymentId, appliedAt }
selfOrder: true          // 셀프 등록 오더 (앱 밖 수주, 캐시백·매칭 없음, createdBy == matchedProUid)
```

## 3. 결제 흐름 (토스)
- 클라이언트 키 `REACT_APP_TOSS_CLIENT_KEY`(없으면 문서 테스트 키 `test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm`), 서버 `TOSS_SECRET_KEY`(functions/.env.*, 없으면 `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6`).
- SDK `@tosspayments/tosspayments-sdk` v2 결제위젯(스카이링크 `payService.js` 방식). 성공 `/pay/success`, 실패 `/pay/fail`.
- Cloud Functions(v2 onCall, region asia-northeast3):
  - `tossPrepare({ purpose, refId })` → 서버가 금액을 계산(설정 문서·오더 금액 기반, 앞단 금액 불신) → `payments` ready 문서 → `{ tossOrderId, amount, orderName }`
  - `tossConfirm({ paymentKey, orderId(tossOrderId), amount })` → 금액 대조 → 토스 승인 → `payments` done → **서버에서** purpose별 후처리(policy 생성/연장, users.insurance 갱신, orders.insurance 갱신). 중복 호출 안전.
  - `tossBillingIssue({ authKey, customerKey })` → `/v1/billing/authorizations/issue` → policy.billing 저장 + 첫 달 즉시 승인.
  - `insuranceMonthlyCharge` 스케줄(매일 03:00 KST) → `nextChargeAt <= now` 인 monthly policy를 `/v1/billing/{billingKey}` 승인 → 성공 시 endAt·nextChargeAt +1개월, 실패 시 failCount++ (3회면 status expired + 알림).
  - `onInsuranceClaimCreated` → 대리점 관리자(users.insuranceAdmin)에게 notifications + settings.agencyContacts 에 알림톡 자리(현재는 로그만).
- 월 구독형 빌링키 발급 UI: 토스 결제위젯이 아니라 `tossPayments.payment({customerKey}).requestBillingAuth({ method:"CARD", successUrl:"/pay/billing-success", failUrl:"/pay/fail" })` → successUrl 에서 `authKey`,`customerKey` 받아 `tossBillingIssue` 호출.

## 4. 화면
### 사용자 (하단탭 안심케어 → `/insurance`)
- 내 보험 상태(가입 유형·만료일·자동결제 카드) / 가입 유형 3개 카드(가격·설명) / 보장 내용(설정값, 없으면 "보험사 확정 후 안내") / [가입하기] → 본인인증 단계(이름·휴대폰 확인, CP사 연동 자리) → 결제(yearly·perOrder 위젯 / monthly 빌링 인증) → 완료.
- 내 보험 관리: 자동결제 해지(다음 결제일까지 유지), 결제 이력, 사고 접수 목록.
- 사고 접수 `/insurance/claim/:orderId?` — 오더 선택(내 완료·진행 오더), 발생 일시·장소·경위·피해 정도·사진(최대 6장) → 접수. 접수 후 상태 표시.
### 오더 연결 (지휘 에이전트가 담당)
- 접수/셀프 등록 중 "보험 적용" 단계: 가입 유형 확인 → 월·1년 가입자면 "보험 적용됨" 안내 → 미가입자면 건당 1% 결제 버튼(금액 미정 유형은 확정 후) → orders.insurance 기록.
- 체크인 잠금: `orders.insurance.applied !== true` 이면 체크인 버튼 잠금 + "보험 적용을 위해 결제/가입 필요". (보험 미적용으로 그냥 진행하는 선택지도 둔다 — "보험 없이 진행" 확인 → `insurance.applied=false, skipped=true`, 카드에 "보험 적용 제외" 표시.)
- 셀프 등록 오더: 접수폼에 "내가 직접 수주한 일" 스위치 → 캐시백·매칭방식 숨김, createdBy=matchedProUid, orderStatus 배정, 메인 목록 비노출, 나의오더현황에 표시.
### 프로필 배지
- 상호명 아래 "홈프로 도급배상책임보험 가입 업체 (월 구독형 / 1년형)" 한 줄 + "현장 사고 시 최대 OO억 보장"(설정값 있을 때만). 뱃지 스타일 금지 — 텍스트+아이콘.
### 보험대리점 관리자 `/insurance-admin` (운영자 `/admin`과 분리)
- 접근: 로그인 회원 중 `users.insuranceAdmin === true` (운영자 회원목록에서 토글로 부여). 보험 데이터만 본다.
- 탭(기준 탭바 스타일: 하나의 박스, 세로 구분선, 활성=연회색 면+굵은 검정):
  1. 대시보드 — 당월 가입자 수·유형별·보험료 합계 / 사고접수 대기·진행·완료 / 최근 납부 이력 (stat 카드 금지 → 한 줄 표)
  2. 가입자·배서 — 목록(유형·상태·기간·전화 마스킹) 필터(유형·상태·기간) / 상세에서 마스킹 해제(로그) / 상태 변경(해지·연장)
  3. 정산 대사 — payments(purpose insurance_*) 목록, 기간 필터, 합계, 엑셀 다운로드(로그)
  4. 사고 접수 — claims 목록·상세(사진), 상태 변경, 대리점 메모
  5. 설정 — 보험료·보장 문구·대리점 담당자(운영자도 편집 가능)
- 엑셀은 CSV(BOM 포함)로 충분. 다운로드마다 `insurance_admin_logs` 기록 필수.

## 4-1. 대표 9/12 밤 회신으로 바뀐 것 (에이전트 전원 반영)
- **건당 보험료는 카테고리를 위험도 4그룹으로 나눠 그룹별 1~2%** (시공단가 기준). 확정 전이라 임시값: g1 1.0% / g2 1.3% / g3 1.6% / g4 2.0%, 최소 3,000원. 카테고리→그룹 배정표는 대표가 줄 때까지 **모두 g1**.
  ```js
  settings/insurance.perOrder = {
    minPrice: 3000,
    groups: { g1:{label:"1그룹(저위험)",rate:1}, g2:{label:"2그룹",rate:1.3}, g3:{label:"3그룹",rate:1.6}, g4:{label:"4그룹(고위험)",rate:2} },
    categoryGroup: { [categoryId]: "g1"|"g2"|"g3"|"g4" },   // 없으면 defaultGroup
    defaultGroup: "g1",
  }
  ```
  `plans.perOrder.rate`(단일 요율)는 폴백으로만 남긴다. 서버 tossPrepare·클라이언트 표시 모두 `order.categoryId → group → rate`로 계산.
- **월/년 보험료**: 그룹 요율이 정해지면 대표가 안내. 연 보험료는 월보다 할인. 임시값(110,000 / 11,000) 유지.
- **자기부담금 공통 30만원** → `coverage.deductibleText = "30만원 (공통)"` 기본값. 보장 한도는 그룹별로 다를 수 있음 → `coverage.maxByGroup: { g1:"", g2:"", g3:"", g4:"" }` 자리(빈칸이면 "보험사 확정 후 안내").
- **셀프 등록 오더는 B2B 항목 제외**, 보험 적용용 항목만: 일시·주소·카테고리·작업명·기간·시공(공사)단가. (지휘가 접수폼에서 처리)
- **보험대리점 관리자 2명. 마스킹 해제 승인은 홈프로 운영자(/admin)에서.** → 대리점 관리자의 [전화번호 보기]는 곧바로 해제하지 않고 `insurance_unmask_requests/{id}` = `{ requesterUid, requesterName, policyId|claimId, target, status:"pending"|"approved"|"rejected", requestedAt, decidedBy, decidedAt }` 를 만들고, 운영자가 승인하면 그 대리점 관리자 화면에서 원문이 보인다(승인 건은 `insurance_admin_logs` action "unmask"). 운영자 승인 UI는 에이전트 C가 `AdminSettingsPage`의 보험 섹션에 "마스킹 해제 요청" 목록으로 넣는다.

## 5. 파일 소유권 (병렬 작업 충돌 방지)
- **에이전트 A(서버)**: `functions/tossPay.js`(신규), `functions/insurance.js`(신규), `functions/index.js`(맨 아래 mount 줄만 추가), `functions/.env.example`(키 이름 추가), `functions/package.json`(필요 시).
- **에이전트 B(사용자 화면·결제)**: `src/utility/tossConfig.js`, `src/service/payService.js`, `src/service/InsuranceService.js`, `src/page/pay/*`(PayPage·PaySuccess·PayFail·BillingSuccess), `src/page/insurance/*`(InsurancePage 전면 개편·InsuranceClaimPage·InsuranceMyPage), `package.json`(SDK 추가). **App.js는 건드리지 말고 라우트 목록을 보고서로.**
- **에이전트 C(대리점 관리자)**: `src/page/insurance-admin/*`(Layout·5탭 페이지), `src/service/InsuranceAdminService.js`, `src/page/admin/AdminUsersPage.js`(insuranceAdmin 토글 1곳만), `src/page/admin/AdminSettingsPage.js`(보험 설정 섹션 1곳만). **App.js 라우트는 보고서로.**
- **지휘(카스)**: `src/App.js` 라우트 합치기, 오더 연결(`OrderCreatePage`·`WorkLogPage`·`OrderDetailPage`·`MyOrdersPage`), 프로필 배지(`BizProfilePage`·`ProfilePopup`), 배포.
