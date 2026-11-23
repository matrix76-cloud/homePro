// 푸시 알림 음성 — 앱을 보고 있을 때 온 알림은 휴대폰이 소리를 내지 않으므로 웹이 직접 튼다.
// (앱이 꺼져 있거나 뒤에 있을 때의 소리는 앱 껍데기의 알림 채널 · 소리 파일이 맡는다 — 서버가 같은 이름을 보낸다)
//
// 소리 이름은 서버(functions/index.js 의 PUSH_SOUNDS)가 푸시 data.sound 로 내려 준다.
// 새 음성을 받으면: public/sounds/<이름>.mp3 를 넣고 아래 FILES 에 한 줄 + 서버 PUSH_SOUNDS 에 알림 종류를 잇는다.
//
// ★RN 웹뷰 안에서는 new Audio().play() 가 '사람이 누른 동작' 없이는 막힌다 → Web Audio 로 튼다.
//   AudioContext 도 처음엔 잠겨 있어, 첫 터치 때 빈 소리를 한 번 틀어 깨워 둔다.
const FILES = {
  quote_arrived: "/sounds/quote_arrived.mp3", // "견적서가 도착했습니다" (대표 제공 11/23)
};

let ctx = null;
let inited = false;
const buffers = {};
let lastKey = "";

function getCtx() {
  if (ctx) return ctx;
  const AC = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}

async function load(name) {
  if (buffers[name]) return buffers[name];
  const c = getCtx();
  if (!c) throw new Error("no audio context");
  const res = await fetch(FILES[name]);
  const arr = await res.arrayBuffer();
  // 사파리(아이폰 웹뷰)는 콜백 꼴만 받는 판이 있어 콜백으로 감싼다
  buffers[name] = await new Promise((ok, no) => { c.decodeAudioData(arr, ok, no); });
  return buffers[name];
}

/** 앱 시작 때 한 번 — 첫 터치에 소리 장치를 깨우고 음성을 미리 받아 둔다 */
export function initPushSound() {
  if (inited || typeof window === "undefined") return;
  inited = true;
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    try {
      if (c.state === "suspended") c.resume();
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch (e) { /* 못 깨워도 다음 터치에 다시 */ }
    Object.keys(FILES).forEach((k) => { load(k).catch(() => {}); });
    if (c.state === "running") {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchend", unlock, true);
    }
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("touchend", unlock, true);
}

/** 이름에 맞는 음성을 한 번 튼다. key 가 같으면(같은 푸시가 두 번 전달된 경우) 다시 틀지 않는다 */
export async function playPushSound(name, key = "") {
  if (!name || !FILES[name]) return false;
  if (key && key === lastKey) return false;
  if (key) lastKey = key;
  try {
    const c = getCtx();
    if (!c) return false;
    if (c.state === "suspended") await c.resume();
    const buf = await load(name);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    return true;
  } catch (e) {
    return false;
  }
}
