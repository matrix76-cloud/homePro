/* eslint-disable */
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/** AI 응답에서 JSON 추출 */
const extractJson = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  const raw = text.match(/(\{[\s\S]*\})/);
  return raw ? raw[1] : text;
};

/**
 * AI 견적 분석 요청
 * @returns {{ status, estimate?, questions?, partialEstimate?, reasoning? }}
 */
export async function getAiEstimate({ categoryName, subcategories, spaceType, area, description }) {
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

  // 30초 타임아웃
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI 분석 시간 초과")), 30000)
  );

  const apiCall = geminiModel.generateContent(prompt);
  const result = await Promise.race([apiCall, timeout]);
  const text = result.response.text();

  const jsonStr = extractJson(text);
  return JSON.parse(jsonStr);
}
