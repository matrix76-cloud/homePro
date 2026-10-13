import { db } from "../api/config";
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";

// 글·댓글·채팅 신고 (애플 심사 1.2 — 사용자가 쓴 내용엔 신고·차단이 있어야 한다, 2026-10-01)
// 블랙리스트 신고(homepro_blacklist)는 업체를 공개 게시판에 올리는 용도라 따로 둔다.
const COL = "homepro_reports";

export const REPORT_REASONS = ["스팸·광고", "욕설·비방", "음란·불쾌한 내용", "사기·허위 정보", "기타"];
export const REPORT_TARGET_LABEL = { post: "커뮤니티 글", comment: "커뮤니티 댓글", chat: "채팅" };

// 신고 접수 — target: { type, postId, commentId, roomId, targetUid, targetName, snippet }
export const reportContent = async (reporterUid, target, { reasonType, content = "" }) => {
  if (!reporterUid) throw new Error("로그인 정보가 없습니다");
  await addDoc(collection(db, COL), {
    reporterUid,
    targetType: target.type,
    postId: target.postId || null,
    commentId: target.commentId || null,
    roomId: target.roomId || null,
    targetUid: target.targetUid || null,
    targetName: target.targetName || "",
    snippet: String(target.snippet || "").slice(0, 300),
    reasonType,
    content: String(content || "").slice(0, 500),
    status: "pending",
    createdAt: serverTimestamp(),
  });
};

// 관리자 — 전체 신고 (최신순)
export const getAllReports = async () => {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// 관리자 — 처리 상태 변경 (pending · hidden · dismissed)
export const updateReportStatus = async (reportId, status) => {
  await updateDoc(doc(db, COL, reportId), { status, handledAt: serverTimestamp() });
};
