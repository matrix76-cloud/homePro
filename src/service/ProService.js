/* eslint-disable */
import { db, storage } from "../api/config";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS } from "../config/homeproConfig";

/**
 * 사업자등록증 이미지를 Firebase Storage에 업로드
 * @returns {string} 다운로드 URL
 */
export async function uploadBusinessLicense(uid, categoryId, file) {
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
 * 전문가 카테고리 신청 문서를 Firestore에 저장 (자동 승인)
 * @param {object} detailInfo - { subcategories, experience, intro, region }
 */
export async function registerProCategory(uid, categoryId, licenseUrl, photoUrls = [], detailInfo = {}) {
    const docId = `${uid}_${categoryId}`;
    await setDoc(doc(db, COLLECTIONS.PROS, docId), {
        uid,
        categoryId,
        licenseUrl,
        photoUrls,
        detail: detailInfo,
        status: "approved",
        appliedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
    });
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
