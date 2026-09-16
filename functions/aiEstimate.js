/**
 * AI 견적 — Vertex AI Gemini 를 서버에서 호출 (2026-09-15)
 *
 * 웹에 Gemini API 키를 넣으면 번들에서 키가 그대로 노출되고, Firebase AI Logic 은 App Check 강제 없이는
 * 막혀 있어서 서버 호출로 옮겼다. 함수 실행 계정(기본 compute SA, 편집자 역할)의 토큰으로 호출하므로
 * 키가 필요 없고 요금은 프로젝트 Blaze 결제로 나간다.
 * 프롬프트는 서버에서 만든다 — 클라이언트가 임의 프롬프트를 보내 무료 Gemini 창구로 쓰지 못하게.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const REGION = "asia-northeast3";
const MODEL = process.env.AI_ESTIMATE_MODEL || "gemini-2.5-flash";
const clip = (v, n) => String(v || "").slice(0, n);

async function accessToken() {
    const r = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
        headers: { "Metadata-Flavor": "Google" },
    });
    if (!r.ok) throw new Error("토큰 발급 실패 " + r.status);
    return (await r.json()).access_token;
}

const extractJson = (text) => {
    const fenced = text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/);
    if (fenced) return fenced[1];
    const raw = text.match(/(\{[\s\S]*\})/);
    return raw ? raw[1] : text;
};

exports.aiEstimate = onCall({ region: REGION, timeoutSeconds: 60 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const d = request.data || {};
    const categoryName = clip(d.categoryName, 60);
    const subcategories = (Array.isArray(d.subcategories) ? d.subcategories : []).slice(0, 20).map((s) => clip(s, 60));
    const spaceType = clip(d.spaceType, 40);
    const area = clip(d.area, 40);
    const description = clip(d.description, 2000);

    const prompt = `당신은 홈서비스 견적 전문가입니다.

아래 요청 정보를 분석하여 예상 견적을 산출해주세요.

## 요청 정보
- 카테고리: ${categoryName}
- 세부 항목: ${(subcategories || []).join(", ") || "미선택"}
- 공간 유형: ${spaceType || "미입력"}
- 면적: ${area || "미입력"}
- 상세 요청: ${description || "없음"}

## 응답 규칙
1. 견적 산출이 가능하면 JSON으로 응답:
\`\`\`json
{
  "status": "success",
  "estimate": {
    "minPrice": 최소금액(숫자),
    "maxPrice": 최대금액(숫자),
    "avgPrice": 평균금액(숫자),
    "items": [
      { "name": "항목명", "price": 금액, "note": "설명" }
    ],
    "timeEstimate": "예상 소요시간",
    "tip": "고객에게 도움되는 팁"
  },
  "reasoning": "견적 산출 근거 설명"
}
\`\`\`

2. 정보가 부족해서 정확한 견적이 어려우면:
\`\`\`json
{
  "status": "need_info",
  "questions": ["면적을 알려주세요 (평 또는 m²)", "현재 상태를 알려주세요"],
  "partialEstimate": {
    "minPrice": 대략적최소금액,
    "maxPrice": 대략적최대금액,
    "note": "정보가 부족하여 대략적인 범위만 제시합니다"
  }
}
\`\`\`

## 견적 기준
- 대한민국 2026년 기준 시세
- 금액은 원(₩) 단위
- 인건비 + 자재비 + 출장비 포함
- 부가세 별도 안내
- 반드시 순수 JSON만 응답 (설명 텍스트 없이)`;

    const project = process.env.GCLOUD_PROJECT;
    const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${project}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`;
    let resp;
    try {
        resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}` },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
            }),
        });
    } catch (e) {
        console.error("[aiEstimate] fetch", e);
        throw new HttpsError("unavailable", "AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
        console.error("[aiEstimate]", resp.status, JSON.stringify(json || {}).slice(0, 300));
        throw new HttpsError("unavailable", "AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
    const text = (json?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    try {
        return JSON.parse(extractJson(text));
    } catch {
        console.error("[aiEstimate] parse", text.slice(0, 300));
        throw new HttpsError("internal", "AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
    }
});
