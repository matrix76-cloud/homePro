/**
 * 증명서 서비스 — 사업자등록증(필수) · 추가 증명서(선택, 최대 10건)
 *
 * users 문서 스키마
 *  - businessLicense: { url, uploadedAt }              // 사업자등록증 1건 (교체 방식)
 *  - certificates: [{ id, title, url, uploadedAt }]     // 추가 증명서 최대 10건
 *
 * 저장소 경로: homepro/certs/{uid}/...
 * 신뢰지표(누적 오더 완료 건수) 조회도 함께 제공한다 — 프로필/프로필팝업 공용.
 */
import {
  doc, getDoc, updateDoc, setDoc,
  collection, query, where, getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../api/config";
import { COLLECTIONS, ORDER_STATUS } from "../config/homeproConfig";
import { compressDetailImage } from "../utility/imageUtils";

/** 추가 증명서 최대 등록 수 */
export const MAX_CERTIFICATES = 10;

/** 완료로 집계할 상태 (레거시 상태값 포함) */
const COMPLETED_STATUSES = [ORDER_STATUS.COMPLETED, "완료", "리뷰", "작업완료"];

/** 증명서 이미지 업로드 → 다운로드 URL 반환 */
export async function uploadCertificateImage(uid, file, prefix = "cert") {
  if (!uid) throw new Error("UID_REQUIRED");
  if (!file) throw new Error("FILE_REQUIRED");
  // 원본이 무거우면 압축 (문서 이미지는 글자 가독성 필요 → 폭 1200 / 품질 0.7)
  let target = file;
  try {
    target = await compressDetailImage(file, 1200, 0.7);
  } catch {
    target = file;
  }
  const path = `homepro/certs/${uid}/${prefix}_${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, target);
  return getDownloadURL(storageRef);
}

/** users 문서 부분 갱신 (문서가 없으면 생성) */
async function patchUser(uid, patch) {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  try {
    await updateDoc(userRef, patch);
  } catch {
    await setDoc(userRef, patch, { merge: true });
  }
}

/** 사업자등록증 업로드/교체 → { url, uploadedAt } */
export async function saveBusinessLicense(uid, file) {
  const url = await uploadCertificateImage(uid, file, "bizlicense");
  const businessLicense = { url, uploadedAt: new Date().toISOString() };
  await patchUser(uid, { businessLicense });
  return businessLicense;
}

/** 사업자등록증 삭제 (문서 필드만 제거 — 파일은 보존) */
export async function removeBusinessLicense(uid) {
  await patchUser(uid, { businessLicense: null });
  return true;
}

/** 현재 등록된 추가 증명서 목록 */
export async function getCertificates(uid) {
  if (!uid) return [];
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return [];
  const list = snap.data().certificates;
  return Array.isArray(list) ? list : [];
}

/** 추가 증명서 등록 → 갱신된 전체 목록 반환 */
export async function addCertificate(uid, title, file) {
  if (!uid) throw new Error("UID_REQUIRED");
  const name = String(title || "").trim();
  if (!name) throw new Error("서류 제목을 입력해주세요");
  const current = await getCertificates(uid);
  if (current.length >= MAX_CERTIFICATES) {
    throw new Error(`추가 증명서는 최대 ${MAX_CERTIFICATES}건까지 등록할 수 있습니다`);
  }
  const url = await uploadCertificateImage(uid, file, "cert");
  const item = {
    id: `cert_${Date.now()}`,
    title: name,
    url,
    uploadedAt: new Date().toISOString(),
  };
  const next = [...current, item];
  await patchUser(uid, { certificates: next });
  return next;
}

/** 추가 증명서 삭제 → 갱신된 전체 목록 반환 */
export async function removeCertificate(uid, certId) {
  if (!uid) throw new Error("UID_REQUIRED");
  const current = await getCertificates(uid);
  const next = current.filter((c) => c && c.id !== certId);
  await patchUser(uid, { certificates: next });
  return next;
}

/** 사업자등록증 인증 여부 */
export function hasBusinessLicense(profile) {
  return !!(profile && profile.businessLicense && profile.businessLicense.url);
}

/** 업로드 일시 표기 (ISO 문자열 · Firestore Timestamp 모두 처리) */
export function formatUploadedAt(value) {
  if (!value) return "";
  try {
    if (typeof value?.toDate === "function") return value.toDate().toLocaleDateString("ko-KR");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR");
  } catch {
    return "";
  }
}

/**
 * 홈프로 누적 오더 완료 건수 — 수행 프로(matchedProUid) 기준
 * 상태값이 레거시와 혼재하므로 matchedProUid 만으로 조회 후 상태를 필터링한다.
 */
export async function getCompletedOrderCount(uid) {
  if (!uid) return 0;
  try {
    const q = query(collection(db, COLLECTIONS.ORDERS), where("matchedProUid", "==", uid));
    const snap = await getDocs(q);
    let count = 0;
    snap.forEach((d) => {
      if (COMPLETED_STATUSES.includes(d.data()?.orderStatus)) count++;
    });
    return count;
  } catch {
    return 0;
  }
}
