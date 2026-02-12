import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// TODO: 홈프로 전용 Firebase 프로젝트 생성 후 아래 값 교체
export const firebaseConfig = {
    apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
    authDomain: "homepro-43f7f.firebaseapp.com",
    projectId: "homepro-43f7f",
    storageBucket: "homepro-43f7f.firebasestorage.app",
    messagingSenderId: "717297769007",
    appId: "1:717297769007:web:839b080defa7c763e284da",
    measurementId: "G-0KGBWZR2V3"
};

// Firebase 앱 초기화
const firebaseApp = initializeApp(firebaseConfig);

// 필요한 Firebase 서비스 초기화
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

export { db, auth, storage, firebaseApp };
