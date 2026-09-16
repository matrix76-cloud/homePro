/* eslint-disable */
import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp, FUNCTIONS_REGION } from "../api/config";

// AI 견적 — 서버 함수(aiEstimate)가 Vertex AI Gemini 를 호출한다 (2026-09-15).
// 웹에 API 키를 두지 않고, 요금은 Firebase 프로젝트 Blaze 결제로 나간다. 프롬프트는 서버(functions/aiEstimate.js)에 있다.
const callAiEstimate = httpsCallable(getFunctions(firebaseApp, FUNCTIONS_REGION), "aiEstimate", { timeout: 60000 });

/**
 * AI 견적 분석 요청
 * @returns {{ status, estimate?, questions?, partialEstimate?, reasoning? }}
 */
export async function getAiEstimate({ categoryName, subcategories, spaceType, area, description }) {
  try {
    const res = await callAiEstimate({ categoryName, subcategories, spaceType, area, description });
    return res.data;
  } catch (e) {
    throw new Error(e?.message || "AI 분석에 실패했습니다");
  }
}
