/* eslint-disable */
import { KR_AREAS } from "./constants";

/**
 * 좌표 → 시/도, 구/군 변환 (카카오 역지오코딩 API)
 * 카카오 REST API 키 필요
 */
export async function reverseGeocode(latitude, longitude) {
    const KAKAO_REST_KEY = process.env.REACT_APP_KAKAO_REST_KEY;
    if (!KAKAO_REST_KEY) {
        console.warn("REACT_APP_KAKAO_REST_KEY 없음 — 역지오코딩 불가");
        return null;
    }

    try {
        const res = await fetch(
            `https://dapi.kakao.com/v2/local/geo/coord2regioninfo.json?x=${longitude}&y=${latitude}`,
            { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } }
        );
        if (!res.ok) return null;

        const data = await res.json();
        const doc = data.documents?.find((d) => d.region_type === "H") || data.documents?.[0];
        if (!doc) return null;

        return {
            sido: doc.region_1depth_name || "",   // "서울특별시"
            gu: doc.region_2depth_name || "",      // "강남구"
            dong: doc.region_3depth_name || "",    // "역삼동"
        };
    } catch (e) {
        console.error("역지오코딩 실패:", e);
        return null;
    }
}

/**
 * 역지오코딩 결과를 KR_AREAS의 sido/gu 키로 매핑
 * "서울특별시" → "서울", "경기도" → "경기" 등
 */
const SIDO_MAP = {
    "서울특별시": "서울",
    "경기도": "경기",
    "인천광역시": "인천",
    "대구광역시": "대구",
    "대전광역시": "대전",
    "광주광역시": "광주",
    "울산광역시": "울산",
    "부산광역시": "부산",
    "세종특별자치시": "세종",
    "제주특별자치도": "제주",
    "강원특별자치도": "강원",
    "강원도": "강원",
    "충청북도": "충북",
    "충청남도": "충남",
    "경상북도": "경북",
    "경상남도": "경남",
    "전라북도": "전북",
    "전북특별자치도": "전북",
    "전라남도": "전남",
};

export function mapToKrArea(geocodeResult) {
    if (!geocodeResult) return null;

    const sidoKey = SIDO_MAP[geocodeResult.sido] || geocodeResult.sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, "");
    const area = KR_AREAS.find((a) => a.sido === sidoKey);
    if (!area) return { sido: sidoKey, gu: "전체" };

    // gu 매칭 (부분 매칭 지원: "수원시 장안구" ← "장안구")
    const rawGu = geocodeResult.gu || "";
    const matched = area.guList.find((g) => g === rawGu || g.includes(rawGu) || rawGu.includes(g));

    return {
        sido: sidoKey,
        gu: matched || "전체",
    };
}

/**
 * 웹 Geolocation API로 현재 위치 가져오기 (RN이 아닌 웹 브라우저용)
 */
export function getWebLocation(timeoutMs = 10000) {
    return new Promise((resolve) => {
        if (!navigator?.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 }
        );
    });
}

/**
 * region 객체를 표시용 문자열로 변환
 * { sido: "서울", gu: "강남구" } → "서울시 강남구"
 */
export function regionToDisplayName({ sido, gu }) {
    const sidoDisplay = sido.endsWith("시") || sido.endsWith("도") ? sido : `${sido}시`;
    if (!gu || gu === "전체") return `${sidoDisplay} 전체`;
    return `${sidoDisplay} ${gu}`;
}

/**
 * 표시용 문자열 → region 객체로 파싱
 * "서울시 강남구" → { sido: "서울", gu: "강남구" }
 */
export function parseDisplayName(str) {
    if (!str) return { sido: "서울", gu: "전체" };
    const parts = str.trim().split(" ");
    const rawSido = (parts[0] || "서울").replace(/시$|도$/, "");
    return {
        sido: rawSido,
        gu: parts.length >= 2 ? parts.slice(1).join(" ") : "전체",
    };
}
