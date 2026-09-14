import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, inMemoryPersistence, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

/**
 * Firebase 프로젝트 설정
 *
 * 값은 .env 의 REACT_APP_FB_* 에서 읽는다. 프로젝트를 갈아끼울 때 이 파일은 손대지 않고
 * .env(로컬) / .env.production(배포) 의 값만 바꾸면 된다. 자세한 절차는 docs/서버이관.md 참고.
 *
 * 환경변수가 하나도 없으면 기존 개발 프로젝트(homepro-43f7f)로 폴백한다.
 * 이관이 끝나 새 프로젝트로 완전히 넘어가면 이 폴백은 지워도 된다.
 */
const LEGACY = {
    apiKey: 'AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc',
    authDomain: 'homepro-43f7f.firebaseapp.com',
    projectId: 'homepro-43f7f',
    storageBucket: 'homepro-43f7f.firebasestorage.app',
    messagingSenderId: '717297769007',
    appId: '1:717297769007:web:839b080defa7c763e284da',
    measurementId: 'G-0KGBWZR2V3',
};

const env = process.env;

export const firebaseConfig = {
    apiKey: env.REACT_APP_FB_API_KEY || LEGACY.apiKey,
    authDomain: env.REACT_APP_FB_AUTH_DOMAIN || LEGACY.authDomain,
    projectId: env.REACT_APP_FB_PROJECT_ID || LEGACY.projectId,
    storageBucket: env.REACT_APP_FB_STORAGE_BUCKET || LEGACY.storageBucket,
    messagingSenderId: env.REACT_APP_FB_MESSAGING_SENDER_ID || LEGACY.messagingSenderId,
    appId: env.REACT_APP_FB_APP_ID || LEGACY.appId,
    measurementId: env.REACT_APP_FB_MEASUREMENT_ID || LEGACY.measurementId,
};

// 어느 프로젝트에 붙었는지 개발 중에 바로 보이게 (배포 빌드에서는 출력하지 않음)
if (process.env.NODE_ENV !== 'production') {
    const usingEnv = Boolean(env.REACT_APP_FB_PROJECT_ID);
    console.info(
        `[firebase] project=${firebaseConfig.projectId} (${usingEnv ? '.env' : '기본값 폴백'})`
    );
}

// Cloud Functions 리전 — functions/ 쪽 배포 리전과 반드시 같아야 한다.
export const FUNCTIONS_REGION = env.REACT_APP_FB_FUNCTIONS_REGION || 'asia-northeast3';

/** HTTP 함수(onRequest) 전체 URL. 예: functionUrl('resetPassword') */
export const functionUrl = (name) =>
    `https://${FUNCTIONS_REGION}-${firebaseConfig.projectId}.cloudfunctions.net/${name}`;

/**
 * 공유 링크·OG 등 외부에 노출되는 절대 URL의 기준 도메인.
 * .env 에 REACT_APP_PUBLIC_BASE_URL 이 있으면 그 값, 없으면 현재 접속 도메인,
 * 그것도 없으면(빌드 타임 등) Hosting 기본 도메인.
 */
export const PUBLIC_BASE_URL =
    env.REACT_APP_PUBLIC_BASE_URL ||
    (typeof window !== 'undefined' && window.location ? window.location.origin : '') ||
    `https://${firebaseConfig.projectId}.web.app`;

// Firebase 앱 초기화
const firebaseApp = initializeApp(firebaseConfig);

// 필요한 Firebase 서비스 초기화
const db = getFirestore(firebaseApp);
// 리뷰 페이지(/review)는 폰 4개를 iframe 으로 띄워 각각 다른 계정으로 로그인한다.
// 같은 주소의 프레임은 로그인 저장소(IndexedDB)를 공유해서 한 폰에서 로그인하면 다른 폰도 같은 계정이 돼 버린다.
// → 리뷰 폰 프레임(iframe name 이 'rvphone' 으로 시작)에서는 로그인을 메모리에만 두어 프레임마다 따로 산다.
//   (window.name 은 프레임 안에서 페이지를 옮겨도 유지되므로 쿼리스트링을 끌고 다닐 필요가 없다.)
const isReviewPhoneFrame = (() => { try { return typeof window !== 'undefined' && /^rvphone/.test(window.name || ''); } catch (e) { return false; } })();
const auth = isReviewPhoneFrame
    ? initializeAuth(firebaseApp, { persistence: inMemoryPersistence })
    : initializeAuth(firebaseApp, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
void getAuth; // getAuth(firebaseApp) 를 부르는 다른 모듈은 위에서 초기화한 같은 인스턴스를 돌려받는다
const storage = getStorage(firebaseApp);

export { db, auth, storage, firebaseApp };
