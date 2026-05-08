# 테스트 데이터 시드/정리 가이드

## 1. 배포 (한 번만)

```bash
cd /Users/sungwon/Downloads/2026Dev/mainproject/2026Web/homePro
firebase deploy --only functions:cleanAllTestData,functions:seedTestData
```

배포 시간 1~2분. 끝나면 두 함수의 URL이 출력됨.
URL 패턴 (asia-northeast3 리전):
```
https://cleanalltestdata-<해시>-du.a.run.app
https://seedtestdata-<해시>-du.a.run.app
```

> Firebase Console → Functions 탭에서도 URL 복사 가능.

---

## 2. 호출 — 정리 먼저, 시드 다음

### 2-1. 기존 데이터 정리 (⚠️ 매우 위험)

> **주의**: `cleanAllTestData`는 시드/운영 구분 없이 화이트리스트 컬렉션을 통째로 비우고 **Firebase Auth 사용자 전체를 삭제**한다.
> 운영 데이터(=실제 사용자/관리자 계정)가 있는 프로젝트에서 호출하면 모두 사라짐. **dev 프로젝트에서만 사용**.

```bash
curl -X POST \
  -H "x-seed-secret: homepro-seed-2026-x9k3p" \
  https://cleanalltestdata-<해시>-du.a.run.app
```

응답 예시:
```json
{
  "ok": true,
  "result": {
    "collections": {
      "homepro_orders": 12,
      "homepro_worker_requests": 0,
      "homepro_marketplace": 0,
      "homepro_trainings": 0,
      "homepro_cash": 35,
      "chatRooms": 8,
      "users": 5,
      "phones": 5,
      "homepro_subscriptions": 0
    },
    "authUsers": 5,
    "orderSubcollections": 18,
    "chatSubcollections": 50
  }
}
```

### 2-2. 시드 데이터 생성

```bash
curl -X POST \
  -H "x-seed-secret: homepro-seed-2026-x9k3p" \
  https://seedtestdata-<해시>-du.a.run.app
```

응답:
```json
{
  "ok": true,
  "created": {
    "users": 15, "orders": 22, "applicants": 6,
    "quotes": 6, "reviews": 3, "chatRooms": 4,
    "posts": 12, "cash": 18
  },
  "accounts": [
    { "id": "A1", "uid": "seed_A1", "phone": "+821000000001", "password": "Test1234!" },
    ...
  ]
}
```

---

## 3. 로그인 정보

시드 계정은 **phoneNumber 기반 Auth + 전화번호 인증 우회**로 만들어져, 일반 카카오·구글 OAuth/SMS 인증 흐름으로는 로그인할 수 없다.
대신 `getSeedLoginToken` 함수가 발급하는 **customToken**으로만 로그인이 가능하며, 이 흐름은 `/seed-login` 페이지에 구현되어 있다.

### 3-1. 시드 로그인 페이지 사용 (권장)

1. 앱에서 `/seed-login` 으로 진입.
2. 상단 입력창에 `getSeedLoginToken` 함수 URL 입력 후 [저장]. 이후 같은 브라우저에서 자동 입력됨.
3. 의뢰자/홈프로 카드 클릭 → 해당 시드 계정으로 즉시 로그인 → `/MobileMain` 으로 이동.

### 3-2. 시드 계정 목록

| ID | 닉네임 | 전화번호 (E.164) | 역할 |
|---|---|---|---|
| A1 | 성실한청소부 | +821000000001 | 의뢰자 |
| A2 | 부지런한사장 | +821090010001 | 의뢰자 |
| A3 | 똑똑한대표 | +821090010002 | 의뢰자 |
| A4 | 친절한매니저 | +821090010003 | 의뢰자 |
| A5 | 빠른오너 | +821090010004 | 의뢰자 |
| B1 | 용감한강아지 | +821000000003 | 홈프로 |
| B2 | 든든한기술자 | +821090020001 | 홈프로 |
| B3 | 노련한장인 | +821090020002 | 홈프로 |
| B4 | 정직한작업자 | +821090020003 | 홈프로 (지정배정) |
| B5~B9 | 성실프로A~E | +82109002000{5..9} | 홈프로 (지원자 풀) |

> `seedTestData` 응답의 `accounts[].password` 필드에 `Test1234!` 가 보이지만 이 값은 **사용되지 않는다** —
> phoneNumber 계정은 password 인증을 지원하지 않으므로 표시용일 뿐. 로그인은 customToken 흐름만 작동.

---

## 4. 정리 (테스트 끝나고)

`cleanAllTestData` 다시 호출 → 모든 시드 데이터 삭제.

또는 시드 함수만 다시 호출 → 자동으로 같은 UID로 덮어쓰기 (auth는 already-exists 무시).

---

## 5. Secret 토큰

`functions/seed.js` 상단 `SECRET = "homepro-seed-2026-x9k3p"` 변경 가능.
변경 후 재배포 필요.

테스트 끝나면 두 함수를 삭제하는 게 안전:
```bash
firebase functions:delete cleanAllTestData seedTestData
```
