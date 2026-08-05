/* eslint-disable */
/**
 * 현장 작업기록(현장 인증) 서비스
 *
 * 대표님 지시(2026-08-04 리뷰 order-create):
 *  - 현장 도착 시 체크인(Before 사진), 작업 중 특이사항, 완료 시 체크아웃(After 사진)
 *  - 촬영 시각 / GPS 좌표 / 사진을 함께 저장하고, 배상책임보험 분쟁 시 증빙으로 활용
 *  - Before / After 를 반드시 짝으로 남기도록 UI에서 강제
 *
 * 저장 구조
 *   homepro_orders/{orderId}/worklogs/{logId}
 *     { type, byUid, byName, at(서버시각), capturedAt(기기시각), geo, geoError, note, photos[] }
 *   photos[]: { url, path, hash, size, capturedAt }
 *   요약 필드는 오더 문서에 함께 기록 — 목록에서 서브컬렉션을 매번 읽지 않기 위함
 *     { checkInAt, checkOutAt, workLogCount }
 *
 * 무결성에 대해
 *   지시서에는 "메타데이터가 암호화되어 DB에 기록"으로 적혀 있으나, 실제로 필요한 것은
 *   비밀 유지(암호화)가 아니라 사후 변조 여부를 판별할 수 있는 무결성 증명이다.
 *   (암호화해도 앱이 복호화할 수 있으면 위조를 막지 못한다.)
 *   그래서 사진 원본 바이트의 SHA-256 해시를 기록해 둔다 — 나중에 제출된 사진을 다시
 *   해싱해서 대조하면 원본과 다른지 즉시 확인된다. 위치·시각은 기기에서 취득한 값을
 *   그대로 저장하고, 서버 시각(at)과 함께 남겨 두 값의 차이로도 교차 검증이 가능하다.
 */

import {
  collection, addDoc, doc, getDocs, updateDoc, query, orderBy, serverTimestamp, increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../api/config";
import { COLLECTIONS, STORAGE_PATH_PREFIX } from "../config/homeproConfig";

export const WORKLOG_TYPES = {
  CHECKIN: "checkin",     // 현장 도착 (Before)
  PROGRESS: "progress",   // 작업 중 특이사항
  CHECKOUT: "checkout",   // 작업 완료 (After)
};

export const WORKLOG_LABELS = {
  [WORKLOG_TYPES.CHECKIN]: "현장 체크인",
  [WORKLOG_TYPES.PROGRESS]: "작업 중 기록",
  [WORKLOG_TYPES.CHECKOUT]: "작업완료 체크아웃",
};

/** 사진 종류 안내 — 등록 화면에서 그대로 노출 */
export const WORKLOG_PHOTO_HINT = {
  [WORKLOG_TYPES.CHECKIN]: "작업 전(Before) 현장 상태가 보이도록 촬영해 주세요.",
  [WORKLOG_TYPES.PROGRESS]: "추가 작업·파손 등 특이사항이 보이도록 촬영해 주세요.",
  [WORKLOG_TYPES.CHECKOUT]: "체크인 때와 같은 위치·각도로 작업 후(After) 상태를 촬영해 주세요.",
};

const logsRef = (orderId) => collection(db, COLLECTIONS.ORDERS, orderId, "worklogs");

/* ─────────────── 위치 ─────────────── */

/**
 * 현재 위치 취득. 거부·실패해도 기록 자체는 남길 수 있어야 하므로 절대 throw 하지 않는다.
 * (RN WebView 는 앱 권한이 없으면 조용히 timeout 되는 경우가 있어 타임아웃을 짧게 둔다)
 */
export function getCurrentGeo({ timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ geo: null, geoError: "unsupported" });
      return;
    }
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    navigator.geolocation.getCurrentPosition(
      (pos) => finish({
        geo: {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 0),
        },
        geoError: null,
      }),
      (err) => finish({
        geo: null,
        geoError: err?.code === 1 ? "denied" : err?.code === 3 ? "timeout" : "unavailable",
      }),
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
    setTimeout(() => finish({ geo: null, geoError: "timeout" }), timeout + 500);
  });
}

export const GEO_ERROR_TEXT = {
  denied: "위치 권한이 꺼져 있어 좌표 없이 기록됩니다",
  timeout: "위치를 확인하지 못해 좌표 없이 기록됩니다",
  unavailable: "위치를 확인할 수 없어 좌표 없이 기록됩니다",
  unsupported: "이 기기에서는 위치를 기록할 수 없습니다",
};

/* ─────────────── 사진 ─────────────── */

/**
 * 증빙용 압축 — 오더 사진(400px/0.3)보다 훨씬 크게 남긴다.
 * 얼룩·누수 부위처럼 판독이 필요한 사진이라 과하게 줄이면 증빙 가치가 없다.
 */
export function compressEvidencePhoto(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("이미지 처리 실패")),
          "image/jpeg", quality,
        );
      };
      img.onerror = () => reject(new Error("이미지를 읽지 못했습니다"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다"));
    reader.readAsDataURL(file);
  });
}

/** 사진 바이트의 SHA-256 — 사후 변조 대조용 (crypto.subtle 미지원 환경은 건너뜀) */
async function hashBlob(blob) {
  try {
    if (!window.crypto?.subtle) return "";
    const buf = await blob.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/* ─────────────── 기록 ─────────────── */

/**
 * 현장기록 등록
 *  photos: [{ blob, capturedAt }]  — 체크인·체크아웃은 최소 1장 (호출 전 검증)
 */
export async function addWorkLog(orderId, {
  type, byUid, byName, note = "", photos = [], geo = null, geoError = null,
}) {
  if (!orderId) throw new Error("오더 정보가 없습니다");
  if (!Object.values(WORKLOG_TYPES).includes(type)) throw new Error("기록 유형이 올바르지 않습니다");
  if (type !== WORKLOG_TYPES.PROGRESS && photos.length === 0) {
    throw new Error("사진을 최소 1장 첨부해 주세요");
  }

  const capturedAt = new Date().toISOString();
  const uploaded = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const hash = await hashBlob(p.blob);
    const path = `${STORAGE_PATH_PREFIX}/worklogs/${orderId}/${type}_${Date.now()}_${i}.jpg`;
    const snap = await uploadBytes(ref(storage, path), p.blob, { contentType: "image/jpeg" });
    uploaded.push({
      url: await getDownloadURL(snap.ref),
      path,
      hash,
      size: p.blob.size,
      capturedAt: p.capturedAt || capturedAt,
    });
  }

  const docRef = await addDoc(logsRef(orderId), {
    type,
    byUid: byUid || "",
    byName: byName || "",
    note: note.trim(),
    photos: uploaded,
    geo,
    geoError,
    capturedAt,
    at: serverTimestamp(),
  });

  // 목록·카드에서 쓰는 요약 필드 (서브컬렉션을 매번 읽지 않기 위함)
  const summary = { workLogCount: increment(1) };
  if (type === WORKLOG_TYPES.CHECKIN) summary.checkInAt = serverTimestamp();
  if (type === WORKLOG_TYPES.CHECKOUT) summary.checkOutAt = serverTimestamp();
  try {
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), summary);
  } catch (e) {
    console.warn("현장기록 요약 갱신 실패:", e.message);
  }

  return { id: docRef.id };
}

/** 현장기록 조회 (오래된 순 — 체크인 → 진행 → 체크아웃 흐름 그대로) */
export async function getWorkLogs(orderId) {
  try {
    const snap = await getDocs(query(logsRef(orderId), orderBy("at", "asc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("현장기록 조회 실패:", e.message);
    return [];
  }
}

/** 체크인/체크아웃 여부 — 요약 필드가 없는 옛 오더는 로그 배열로 판정 */
export function summarizeLogs(logs = []) {
  return {
    checkIn: logs.find((l) => l.type === WORKLOG_TYPES.CHECKIN) || null,
    checkOut: logs.find((l) => l.type === WORKLOG_TYPES.CHECKOUT) || null,
    progress: logs.filter((l) => l.type === WORKLOG_TYPES.PROGRESS),
  };
}

/** 체크인한 오더인지 (카드 버튼 분기용) */
export function hasCheckedIn(order) {
  return !!order?.checkInAt;
}

export function hasCheckedOut(order) {
  return !!order?.checkOutAt;
}
