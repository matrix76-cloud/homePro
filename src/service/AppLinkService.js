/**
 * 앱 스토어 주소 — 랜딩의 앱 다운로드 섹션과 이동 페이지(/app)가 같이 쓴다.
 *
 * 기준은 관리자 설정 Firestore `settings/appLinks` { androidUrl, iosUrl }.
 * 문서가 없거나 값이 비어 있으면 아래 기본값을 쓴다. 비어 있는 쪽은 화면에서 "출시 준비 중"으로 표시된다.
 *  · 2026-09-20 기준 두 스토어 모두 미출시(플레이 com.homepro 404, 앱스토어 조회 0건)라 기본값을 비워 둔다.
 *  · 출시되면 settings/appLinks 에 주소만 넣으면 배포 없이 바로 살아난다.
 *    안드로이드: https://play.google.com/store/apps/details?id=com.homepro
 *    아이폰:     https://apps.apple.com/kr/app/id<앱스토어 숫자 ID>
 */
import { db } from "../api/config";

export const APP_PAGE_URL = "https://www.tryhomepro.com/app"; // QR(public/assets/landing/app-qr.svg)이 가리키는 주소
// 기본값은 빌드 환경변수로도 줄 수 있다(REACT_APP_APP_ANDROID_URL / REACT_APP_APP_IOS_URL). 없으면 빈 값 = 출시 준비 중
const FALLBACK = {
  androidUrl: process.env.REACT_APP_APP_ANDROID_URL || "",
  iosUrl: process.env.REACT_APP_APP_IOS_URL || "",
};

let cached = null;
export async function getAppLinks() {
  if (cached) return cached;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "settings", "appLinks"));
    const d = snap.exists() ? snap.data() : {};
    cached = { androidUrl: String(d.androidUrl || FALLBACK.androidUrl).trim(), iosUrl: String(d.iosUrl || FALLBACK.iosUrl).trim() };
  } catch (e) {
    cached = { ...FALLBACK };
  }
  return cached;
}

// "android" | "ios" | "other"
export function detectPlatform() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  if (/android/i.test(ua)) return "android";
  // iPadOS 는 데스크톱 사파리로 자기를 소개한다 → 터치 지원으로 가린다
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)) return "ios";
  return "other";
}
