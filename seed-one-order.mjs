// 일회성: 채팅 테스트용 시드 오더를 우선배정으로 수정 (하단=수락하기, 본문=견적 작성하기)
// 실행: node seed-one-order.mjs
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
  authDomain: "homepro-43f7f.firebaseapp.com",
  projectId: "homepro-43f7f",
  storageBucket: "homepro-43f7f.firebasestorage.app",
  messagingSenderId: "717297769007",
  appId: "1:717297769007:web:839b080defa7c763e284da",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ORDER_ID = "G4ftOhGy2c0HQDngFKa7";

await updateDoc(doc(db, "homepro_orders", ORDER_ID), {
  matchType: "priority", // 다중비교 → 우선배정 (하단 CTA = 수락하기, 지원하기 제거)
  b2bPriceType: "estimate", // 견적요청 유지 → 본문 "견적 작성하기" 노출(채팅 생성)
});

console.log("✅ 오더 업데이트 완료:", ORDER_ID, "→ 우선배정 + 견적요청");
process.exit(0);
