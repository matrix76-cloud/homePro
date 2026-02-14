import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// 글로벌 로딩 상태
export const loadingAtom = atom(false);

// 앱 모드: "pro" (전문가) | "user" (사용자)
export const appModeAtom = atomWithStorage('homepro.appMode', 'pro');

// 전문가 등록 카테고리 ID 배열 (Firestore 기반)
export const proCategoriesAtom = atom([]);

// 선택된 카테고리
export const selectedCategoryAtom = atom(null);

// 오더 리스트 필터
export const orderFilterAtom = atom({
    category: null,
    matchType: null,
    distance: null,
});
