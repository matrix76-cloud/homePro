# 서버 이관 스크립트

소스 Firebase 프로젝트의 Firestore·Auth·Storage 를 타깃 프로젝트로 옮긴다.
전체 절차(권한·리전·키 재발급까지)는 `docs/서버이관.md` 를 먼저 읽을 것. 여기는 스크립트 사용법만.

## 준비

서비스 계정 키 두 개를 `_migration/keys/` 에 둔다 (이 폴더는 커밋되지 않는다).

```
_migration/keys/source-<소스프로젝트ID>.json
_migration/keys/target-<타깃프로젝트ID>.json
```

키 만드는 법 — 각 프로젝트의 Owner 권한 계정으로:

```
gcloud iam service-accounts keys create _migration/keys/source-<프로젝트ID>.json \
  --iam-account=firebase-adminsdk-fbsvc@<프로젝트ID>.iam.gserviceaccount.com \
  --account=<Owner 계정>
```

콘솔에서 받을 때는 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성.

## 실행 순서

```bash
# 1) 먼저 전부 dry-run 으로 확인 (쓰기 없음)
node scripts/migrate/firestore-copy.mjs --dry-run
node scripts/migrate/auth-copy.mjs      --dry-run
node scripts/migrate/storage-copy.mjs   --dry-run

# 2) 실제 이관 — Auth 를 먼저 넣는다(문서가 참조하는 UID 가 먼저 있어야 확인이 쉬움)
node scripts/migrate/auth-copy.mjs
node scripts/migrate/firestore-copy.mjs
node scripts/migrate/storage-copy.mjs

# 3) 검증
node scripts/migrate/verify.mjs
```

실제 실행 시에는 타깃 프로젝트ID 를 직접 입력해야 진행된다(오타로 엉뚱한 프로젝트에 쓰는 사고 방지).
자동화할 때만 `--yes` 를 붙인다.

## 옵션

| 옵션 | 설명 |
|---|---|
| `--dry-run` | 읽기만 하고 쓰지 않는다. 건수만 확인 |
| `--yes` | 확인 입력을 건너뛴다 |
| `--only=a,b` | 지정한 최상위 컬렉션만 (firestore) |
| `--skip=a,b` | 지정한 컬렉션 제외 (firestore) |
| `--overwrite` | 타깃에 이미 있는 문서/파일도 덮어쓴다 (기본은 건너뜀) |
| `--prefix=경로/` | 해당 경로의 파일만 (storage) |

기본이 "이미 있으면 건너뛰기"라서, 중간에 끊겨도 다시 실행하면 남은 것만 이어서 넣는다.

## 알아둘 것

- **문서 ID·UID·파일 경로가 모두 유지된다.** 그래서 `users/{uid}` 같은 연결이 깨지지 않는다.
- **비밀번호도 유지된다.** 소스 프로젝트의 SCRYPT 해시 파라미터를 함께 넘겨 import 하기 때문에,
  기존 회원은 쓰던 비밀번호로 그대로 로그인된다.
- **DocumentReference 필드는 타깃 기준으로 다시 만들어 넣는다.** 안 그러면 소스 프로젝트를 가리킨 채로 복사된다.
- **DB 에 저장된 절대 URL 은 따라오지 않는다.** 이미지 downloadURL 처럼 옛 프로젝트 도메인이 박힌 문자열은
  그대로 남으므로, `verify.mjs` 가 그런 문서를 찾아서 알려준다.
- 이관 중에 소스에 새 데이터가 들어오면 그만큼 빠진다. 사용이 적은 시간대에 하고,
  끝난 뒤 한 번 더 돌려 차이분을 채우는 방식이 안전하다(이미 있는 건 건너뛰므로 반복 실행해도 된다).
