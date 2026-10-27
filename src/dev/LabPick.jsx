/* eslint-disable */
// 시안 랩 고르기 버튼(전역 규칙 2026-10-25 — 형이 번호를 글로 적지 않고 시안 페이지에서 바로 고른다)
// 누르면 Firestore labPicks 에 { tab, no, name, note, at } 한 줄이 남는다. 카스는 ~/.claude/tools/lab-pick/lab_picks.sh 로 읽어 적용한다.
// 원본 틀: ~/.claude/tools/lab-pick/
import React, { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../api/config";

const P = "#00963F"; // 홈프로 포인트색

// 맨 위 한 줄: 덧붙일 말(섞어 고르기) + 지금 이 주제에서 마지막으로 고른 번호
export function usePick(tab) {
  const [last, setLast] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setLast(null);
    // 색인 없이 쓰려고 주제로만 거르고 최신은 여기서 고른다(주제당 몇 줄뿐)
    const q = query(collection(db, "labPicks"), where("tab", "==", tab));
    return onSnapshot(q, (s) => {
      const t = (d) => d.at?.toMillis?.() ?? Date.now(); // 방금 쓴 줄은 서버 시각이 오기 전 null
      setLast(s.docs.map((d) => d.data()).sort((a, b) => t(b) - t(a))[0] || null);
    }, () => {});
  }, [tab]);
  const pick = async (c) => {
    if (busy) return;
    setBusy(true);
    try { await addDoc(collection(db, "labPicks"), { tab, no: c.no, name: c.name || "", note: note.trim(), at: serverTimestamp() }); setNote(""); }
    catch { alert("저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요."); }
    setBusy(false);
  };
  return { last, note, setNote, pick, busy };
}

export function PickBar({ p }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 16px", padding: "12px 14px", background: "#fff", border: "1px solid #D9DDE3" }}>
      <span style={{ fontSize: 15 }}>{p.last ? <>지금 고른 것 <b style={{ color: P }}>{p.last.no}번 {p.last.name}</b>{p.last.note ? ` — ${p.last.note}` : ""}</> : "아직 고른 번호가 없습니다"}</span>
      <input value={p.note} onChange={(e) => p.setNote(e.target.value)} placeholder="덧붙일 말(선택) — 예: 2번에 1번 배너" style={{ flex: 1, minWidth: 240, height: 38, padding: "0 10px", border: "1px solid #D9DDE3", fontSize: 15, fontFamily: "inherit" }} />
    </div>
  );
}

export function PickButton({ p, c }) {
  const on = p.last?.no === c.no;
  return (
    <button type="button" disabled={p.busy} onClick={() => p.pick(c)} style={{ height: 38, padding: "0 16px", border: `1px solid ${P}`, borderRadius: 4, background: on ? P : "#fff", color: on ? "#fff" : P, fontSize: 15, fontWeight: on ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
      {on ? "고른 번호" : "이걸로 고르기"}
    </button>
  );
}
