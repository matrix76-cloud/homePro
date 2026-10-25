import React from "react";

/**
 * 앱 전체 오류 울타리 — 화면 어딘가에서 렌더 오류가 나면 React 가 루트를 통째로 비워
 * 흰 화면만 남는다(React 19). 대신 "다시 시도 / 홈으로" 화면을 보여 준다.
 * 라우터 바깥(index.js)에 두므로 window.location 으로만 이동한다.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // 콘솔에만 남긴다 — 서버 전송은 아직 없다
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error?.message || this.state.error || "").slice(0, 200);
    return (
      <div style={S.wrap}>
        <img src="/homepro-symbol.svg" alt="" width={56} height={56} style={{ opacity: 0.9 }} />
        <div style={S.title}>화면을 그리지 못했어요</div>
        <div style={S.desc}>
          일시적인 문제일 수 있어요. 다시 시도해도 같으면 고객센터로 알려 주세요.
        </div>
        {msg ? <div style={S.detail}>{msg}</div> : null}
        <div style={S.row}>
          <button type="button" style={S.primary} onClick={() => window.location.reload()}>다시 시도</button>
          <button type="button" style={S.ghost} onClick={() => { window.location.href = "/MobileMain"; }}>홈으로</button>
        </div>
      </div>
    );
  }
}

const S = {
  wrap: {
    minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "24px 20px 15vh", background: "#F7F8FA", fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif",
    color: "#1b1f27", textAlign: "center", boxSizing: "border-box",
  },
  title: { fontSize: 21, fontWeight: 700, marginTop: 18 },
  desc: { fontSize: 15, lineHeight: 1.55, marginTop: 10, color: "#2b2f36", maxWidth: 320, wordBreak: "keep-all" },
  detail: { fontSize: 13, lineHeight: 1.5, marginTop: 14, color: "#2b2f36", background: "#fff", border: "1px solid #e3e6eb", padding: "10px 12px", maxWidth: 340, wordBreak: "break-all" },
  row: { display: "flex", gap: 10, marginTop: 24 },
  primary: { height: 50, padding: "0 22px", fontSize: 15, fontWeight: 600, color: "#fff", background: "#00963F", border: "1px solid #00963F", borderRadius: 4, cursor: "pointer" },
  ghost: { height: 50, padding: "0 22px", fontSize: 15, fontWeight: 500, color: "#1b1f27", background: "#fff", border: "1px solid #d5d9e0", borderRadius: 4, cursor: "pointer" },
};
