import { useEffect, useState } from "react";

// PC 폭 화면인지 — 폭 900 이상이고 앱(RN WebView) 안이 아닐 때만 true.
// 랜딩이 접히는 기준(900)과 같다. PC 전용 화면(로그인 등)을 가를 때 쓴다.
export const PC_MIN_WIDTH = 900;

const check = () =>
  typeof window !== "undefined" && !window.ReactNativeWebView && window.innerWidth >= PC_MIN_WIDTH;

export default function usePcWide() {
  const [pc, setPc] = useState(check);
  useEffect(() => {
    const onResize = () => setPc(check());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return pc;
}
