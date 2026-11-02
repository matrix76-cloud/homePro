/* eslint-disable */
import { db, storage } from "../api/config";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS, PRO_APPROVAL_REQUIRED_CATEGORIES } from "../config/homeproConfig";
import { proCoversRegion } from "../utility/regionUtils";

/** 활동 중으로 보는 상태 — 공식 인증 + 공동중개 우선활동(옛 pending 포함) (대표 리뷰 11/02) */
export const ACTIVE_APPROVAL_STATUSES = ["approved", "provisional", "pending"];

/**
 * 관리자 승인이 필요한 카테고리인지 (현재는 공동중개(부동산)만)
 */
export function isApprovalRequiredCategory(categoryId) {
    return PRO_APPROVAL_REQUIRED_CATEGORIES.includes(categoryId);
}

/**
 * 사업자등록증 이미지를 Firebase Storage에 업로드
 * @returns {string} 다운로드 URL
 */
export async function uploadBusinessLicense(uid, categoryId, file) {
    // 개인 프리랜서는 사업자등록증 없이 등록할 수 있다 — 파일이 없으면 빈 값 (B14)
    if (!file) return "";
    const timestamp = Date.now();
    const storageRef = ref(storage, `homepro/licenses/${uid}/${categoryId}_${timestamp}.jpg`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

/**
 * 활동 사진을 Firebase Storage에 업로드 (최대 10장)
 * @returns {string[]} 다운로드 URL 배열
 */
export async function uploadActivityPhotos(uid, categoryId, files) {
    const urls = [];
    for (let i = 0; i < files.length; i++) {
        const timestamp = Date.now();
        const storageRef = ref(storage, `homepro/photos/${uid}/${categoryId}_${timestamp}_${i}.jpg`);
        await uploadBytes(storageRef, files[i]);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
    }
    return urls;
}

/**
 * 자격증 사진을 Firebase Storage에 업로드
 * @param {object[]} certList - [{ certName, file, url }]
 * @returns {object[]} [{ certName, url }] — 사진이 없으면 url 생략
 */
export async function uploadCertLicenses(uid, certList = []) {
    const result = [];
    for (let i = 0; i < certList.length; i++) {
        const cert = certList[i];
        const certName = (cert.certName || "").trim();
        if (!certName && !cert.file && !cert.url) continue;
        let url = cert.url || "";
        if (cert.file) {
            const timestamp = Date.now();
            const storageRef = ref(storage, `homepro/certs/${uid}/${timestamp}_${i}`);
            await uploadBytes(storageRef, cert.file);
            url = await getDownloadURL(storageRef);
        }
        result.push(url ? { certName, url } : { certName });
    }
    return result;
}

/**
 * 인증서 사진이 하나라도 있는지 (공동중개 우선 등록 필수 — 대표 리뷰 11/02)
 *  - 자격증 사본 또는 공인중개사무소 개설등록증 사진: certs[].url 또는 licenseUrl
 */
export function hasCertPhoto(licenseUrl, detailInfo = {}) {
    if (licenseUrl) return true;
    const certs = Array.isArray(detailInfo.certs) ? detailInfo.certs : [];
    return certs.some((c) => !!c?.url);
}

/**
 * 전문가 카테고리 등록 문서를 Firestore에 저장
 * - 기본은 등록 즉시 승인완료(status: "approved" + approvedAt)
 * - 공동중개(부동산)는 선활동 · 후관리 (대표 리뷰 11/02):
 *     인증서 사진을 올리면 status "provisional"(우선활동) + provisionalAt — 승인 대기 없이 바로 활동,
 *     관리자가 사후에 approved / rejected / banned 로 바꾼다. 인증서 사진이 없으면 저장하지 않는다.
 * @param {object} detailInfo - { subcategories, experience, intro, certs, ... }
 * @param {object} opts - { existingStatus } 수정 시 기존 상태 유지용
 */
export async function registerProCategory(uid, categoryId, licenseUrl, photoUrls = [], detailInfo = {}, region = null, opts = {}) {
    const docId = `${uid}_${categoryId}`;
    const needsApproval = isApprovalRequiredCategory(categoryId);
    let existingStatus = opts.existingStatus;
    if (needsApproval) {
        if (!hasCertPhoto(licenseUrl, detailInfo)) {
            throw new Error("CERT_PHOTO_REQUIRED");
        }
        // 등록 화면은 기존 상태를 안 넘긴다 — 제재(banned) 계정이 다시 등록해 풀려나지 않게 직접 읽는다
        if (existingStatus === undefined) {
            try {
                const prev = await getDoc(doc(db, COLLECTIONS.PROS, docId));
                existingStatus = prev.exists() ? prev.data().status || null : null;
            } catch { existingStatus = null; }
        }
        if (existingStatus === "banned") {
            throw new Error("BROKER_BANNED");
        }
    }
    // 이미 공식 인증을 받은 뒤 수정하는 경우엔 승인 상태를 유지. 반려 뒤 다시 등록하면 우선활동으로 돌아간다
    const keepApproved = needsApproval && existingStatus === "approved";
    const status = !needsApproval || keepApproved ? "approved" : "provisional";
    const data = {
        uid,
        categoryId,
        licenseUrl,
        photoUrls,
        detail: detailInfo,
        status,
        appliedAt: serverTimestamp(),
    };
    if (status === "approved") {
        data.approvedAt = serverTimestamp();
    } else if (status === "provisional") {
        data.provisionalAt = serverTimestamp();
    }
    // region: 시·도 이름 배열(새 화면, 여러 곳 · 전국) 또는 { sido, gu }(옛 방식)
    if (Array.isArray(region) && region.length) {
        data.regions = region.includes("전국") ? ["전국"] : region;
        data.region = { sido: data.regions[0], gu: "전체" };
    } else if (region?.sido) {
        data.region = { sido: region.sido, gu: region.gu || "전체" };
    } else {
        // 지역이 비면 regions/region 이 모두 없어 proCoversRegion 이 false — 어떤 목록에도 안 보였다.
        //  안전장치로 전국으로 저장 (B15)
        data.regions = ["전국"];
        data.region = { sido: "전국", gu: "전체" };
    }
    await setDoc(doc(db, COLLECTIONS.PROS, docId), data);
}

/**
 * 전문가 카테고리 등록 정보 조회
 */
export async function getProCategoryDoc(uid, categoryId) {
    const docId = `${uid}_${categoryId}`;
    const snap = await getDoc(doc(db, COLLECTIONS.PROS, docId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * 전문가 카테고리 등록 삭제
 */
export async function deleteProCategory(uid, categoryId) {
    const docId = `${uid}_${categoryId}`;
    await deleteDoc(doc(db, COLLECTIONS.PROS, docId));
}

/**
 * 전문가가 등록한 카테고리 ID 목록 조회
 * @returns {string[]} categoryId 배열
 */
export async function getProCategoryIds(uid) {
    const q = query(collection(db, COLLECTIONS.PROS), where("uid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().categoryId);
}

/** 전문가 등록 목록 (status 포함) */
export async function getMyProDocs(uid) {
    const q = query(collection(db, COLLECTIONS.PROS), where("uid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * 카테고리별 전문가 목록 조회 (지역 필터링)
 * @param {string} categoryId - 카테고리 ID
 * @param {object} region - { sido, gu } (gu가 "전체"이면 시/도 전체)
 * @returns {object[]} 프로 목록
 */
export async function getProsByCategory(categoryId, region) {
    // 활동 지역이 여러 곳 · 전국일 수 있어 지역은 받아 온 뒤 거른다 (대표 10/14)
    //  공동중개는 우선활동(provisional · 옛 pending)도 활동 중이라 함께 보인다 (대표 리뷰 11/02)
    const q = query(
        collection(db, COLLECTIONS.PROS),
        where("categoryId", "==", categoryId),
        isApprovalRequiredCategory(categoryId)
            ? where("status", "in", ACTIVE_APPROVAL_STATUSES)
            : where("status", "==", "approved")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => proCoversRegion(p, region));
}

/**
 * 지역 기반 전체 프로 조회 (카테고리 무관)
 * @param {object} region - { sido, gu }
 * @returns {object[]} 프로 목록
 */
export async function getProsByRegion(region) {
    // 공동중개 우선활동(provisional · 옛 pending)도 활동 중으로 본다 (대표 리뷰 11/02)
    //  다른 분야는 등록 즉시 approved 라 provisional/pending 문서가 없다
    const q = query(
        collection(db, COLLECTIONS.PROS),
        where("status", "in", ACTIVE_APPROVAL_STATUSES)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => proCoversRegion(p, region));
}
