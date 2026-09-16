/**
 * Functions 환경설정 — 외부 서비스 키를 한곳에서만 읽는다.
 *
 * 값은 functions/.env 에서 온다(배포 시 firebase-tools 가 함께 올림).
 * 예전에는 카카오 키·SMS 게이트웨이 주소가 소스에 그대로 박혀 있었는데,
 * 프로젝트를 다른 계정으로 이관할 때 이런 값이 남아 있으면 옛 계정으로 과금이 계속 나간다.
 * 그래서 하드코딩 폴백을 없애고, 값이 없으면 그 기능을 쓰는 순간 명확히 실패하게 했다.
 *
 * 설정 방법은 functions/.env.example 참고.
 */

/** 값이 없으면 호출 시점에 원인이 분명한 에러를 던진다(모듈 로드 시점 아님 — 다른 함수까지 죽지 않게). */
function requireEnv(name, hint) {
    const v = process.env[name];
    if (!v) {
        throw new Error(
            `환경변수 ${name} 가 설정되지 않았습니다. functions/.env 에 추가한 뒤 다시 배포하세요.${hint ? ` (${hint})` : ""}`
        );
    }
    return v;
}

/** 카카오 REST 키 — 로그인(토큰 교환·사용자 조회)과 역지오코딩에 함께 쓰인다. */
const kakaoRestKey = () =>
    requireEnv("KAKAO_REST_KEY", "카카오 개발자 콘솔 > 내 애플리케이션 > 앱 키 > REST API 키");

/** 솔라피(문자) — 인증번호 발송. 게이트웨이 서버 없이 Functions 에서 직접 호출한다(2026-09-15, 옛 게이트웨이 VM 폐기). */
const solapi = () => ({
    apiKey: requireEnv("SOLAPI_API_KEY", "솔라피 콘솔 > API Key 관리"),
    apiSecret: requireEnv("SOLAPI_API_SECRET", "솔라피 콘솔 > API Key 관리"),
    sender: requireEnv("SOLAPI_SENDER", "솔라피에 사전등록된 발신번호, 숫자만"),
});

const REGION = process.env.FUNCTIONS_REGION || "asia-northeast3";

module.exports = { requireEnv, kakaoRestKey, solapi, REGION };
