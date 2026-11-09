/**
 * 앱스토어 심사 녹화용: 커뮤니티 시드 글에 다른 회원 명의 댓글을 넣는다
 * (시드 글엔 commentCount 만 있고 실제 댓글 문서가 없어 '댓글 신고' 장면을 못 찍는다 — 2026-10-01 확인)
 * 실행: node scripts/seed-comments-for-review.mjs   (타깃 = _migration/keys/target-homepro-nexlabs.json)
 * 이미 댓글이 있는 글은 건너뛴다(두 번 돌려도 중복 안 생김). 댓글 수는 실제 댓글 수로 맞춘다.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = JSON.parse(fs.readFileSync(path.join(ROOT, "_migration/keys/target-homepro-nexlabs.json"), "utf8"));
initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();

const U = {
  B1: ["seed_B1", "용감한강아지"], A1: ["seed_A1", "성실한청소부"], B3: ["seed_B3", "노련한장인"],
  B2: ["seed_B2", "든든한기술자"], B4: ["seed_B4", "정직한작업자"], B7: ["seed_B7", "성실프로C"],
  A3: ["seed_A3", "똑똑한대표"], B5: ["seed_B5", "성실프로A"],
};
for (const [, [uid]] of Object.entries(U)) {
  const s = await db.doc(`users/${uid}`).get();
  if (!s.exists) console.log("users 문서 없음(댓글은 그래도 달림):", uid);
}

// 글 id → [작성자, 댓글] (글쓴이 본인은 빼고 다른 회원으로)
const PLAN = {
  lVeZBYHMx7z61wwlP9UK: [["A1", "꿀팁 감사합니다. 저도 약품 희석 비율 때문에 고생했는데 도움이 되네요."], ["B3", "현장 사진도 같이 올려주시면 더 좋을 것 같아요."], ["B5", "저장해 두고 다음 현장에서 써 보겠습니다."]],
  Vp8WX4DHUFau5bdpsSmn: [["B2", "서울 기준으로 탐지만 하면 15만원 안팎, 보수까지 하면 현장 봐야 압니다."], ["B4", "저희는 장비 종류에 따라 다르게 받아요. 열화상 쓰면 조금 더 받습니다."], ["A3", "여러 군데 견적 받아 보시는 게 제일 정확해요."]],
  Weu7Xb7f4c8SibFPMpps: [["B1", "저는 요즘 폴리머 줄눈제 씁니다. 백시멘트보다 변색이 덜해요."], ["B7", "욕실이면 방수 되는 제품으로 가세요. 일반 백시멘트는 금방 곰팡이 납니다."]],
  Ho4O8VZdG69Cuq8hSHLS: [["A1", "저도 성수기엔 지인 팀이랑 품앗이로 돌리고 있어요."], ["B5", "홈프로 오더 넘기기 기능으로 남는 건 넘기고 있습니다. 수수료 받으니 괜찮더라고요."]],
  Vkb1uNV1yBg4UINByAiu: [["B2", "후기 잘 봤습니다. 실외기까지 같이 하셨나요?"], ["A3", "사진 보니 깔끔하네요. 고객 반응도 좋았을 듯."]],
  OMM0CuQfr91MbpXvXcgX: [["B1", "환영합니다. 궁금한 거 있으면 편하게 물어보세요."], ["B4", "반갑습니다. 같이 열심히 해요."], ["B7", "환영해요. 커뮤니티 자주 들러 주세요."]],
};

let n = 0;
const base = Date.now() - 3 * 24 * 3600 * 1000;
for (const [postId, list] of Object.entries(PLAN)) {
  const ref = db.doc(`community_posts/${postId}`);
  if (!(await ref.get()).exists) { console.log("글 없음, 건너뜀:", postId); continue; }
  if ((await ref.collection("comments").count().get()).data().count > 0) { console.log("이미 댓글 있음, 건너뜀:", postId); continue; }
  let t = base + Math.floor(Math.random() * 6) * 3600 * 1000;
  for (const [k, text] of list) {
    const [uid, name] = U[k];
    t += (20 + Math.floor(Math.random() * 90)) * 60 * 1000;
    await ref.collection("comments").add({ text, authorUid: uid, authorName: name, parentId: null, createdAt: Timestamp.fromMillis(t) });
    n++;
  }
  await ref.update({ commentCount: list.length });
  console.log("댓글", list.length, "개 →", postId);
}
console.log("총", n, "개 추가");
process.exit(0);
