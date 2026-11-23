/* eslint-disable */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../api/config";

const postsRef = collection(db, "community_posts");

/** 숨겨진 글인가 — 신고 가림(hidden) · 운영자 강제 숨김(adminHidden) 둘 다 */
export const isPostHidden = (p) => !!p && (p.hidden === true || p.adminHidden === true);

/** 게시글 목록 조회 (type별, 최신순, 최대 20건)
 *  숨겨진 글은 남에게 안 보인다. viewerUid 를 주면 본인이 쓴 숨김 글만 남긴다(화면에서 "운영자에 의해 숨김 처리" 안내) */
export async function getPosts(type, { viewerUid = null } = {}) {
  const q = query(postsRef, where("type", "==", type), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => !isPostHidden(p) || (!!viewerUid && p.authorUid === viewerUid));
}

/**
 * 공지·이벤트 목록 — 관리자 [공지 관리]가 쓰는 notices 컬렉션 {title, content, category, pinned, createdAt}.
 * 커뮤니티 '이벤트/공지' 탭과 /notice 가 같은 목록을 보여 주도록 한 곳에서 읽는다.
 * 고정(pinned) 공지를 먼저, 그 안에서는 최신순.
 */
export async function getNotices() {
  const snap = await getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc")));
  const toMs = (ts) => (ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : ts ? new Date(ts).getTime() || 0 : 0);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return toMs(b.createdAt) - toMs(a.createdAt);
    });
}

/** 게시글 상세 조회 — includeHidden: 관리자가 가려진 글을 확인할 때 · viewerUid: 숨겨진 글은 작성자 본인에게만 열린다 */
export async function getPostById(postId, { includeHidden = false, viewerUid = null } = {}) {
  const snap = await getDoc(doc(db, "community_posts", postId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (isPostHidden(data) && !includeHidden && !(viewerUid && data.authorUid === viewerUid)) return null;
  return { id: snap.id, ...data };
}

/** 신고 처리 — 글·댓글 가리기/되살리기 (관리자). 지우지 않고 hidden 표시만 남긴다.
 *  운영자 강제 숨김(adminHidden, ModerationService)과 같은 글을 가리키도록 두 표시를 함께 맞춘다 */
export async function setPostHidden(postId, hidden) {
  await updateDoc(doc(db, "community_posts", postId), { hidden: !!hidden, adminHidden: !!hidden });
}
export async function setCommentHidden(postId, commentId, hidden) {
  await updateDoc(doc(db, "community_posts", postId, "comments", commentId), { hidden: !!hidden });
}

/** 조회수 +1 — 상세를 열 때 (커뮤니티 시안 4번 "많이 본 글", 형 9/18) */
export async function increaseViewCount(postId) {
  try {
    await updateDoc(doc(db, "community_posts", postId), { viewCount: increment(1) });
  } catch (e) {
    console.warn("조회수 반영 실패:", e.message);
  }
}

/** 게시글 생성 */
export async function createPost({ title, content, images = [], type, authorUid, authorName }) {
  const docRef = await addDoc(postsRef, {
    title,
    content,
    images,
    type,
    authorUid,
    authorName,
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });

  // 포인트 지급: 게시글 작성 보상
  if (authorUid) {
    try {
      const { grantPoints } = await import("./PointService");
      await grantPoints(authorUid, authorName || "사용자", "community_post", { relatedDocId: docRef.id });
    } catch (e) {
      console.warn("게시글 작성 포인트 지급 실패:", e.message);
    }
  }

  return docRef.id;
}

/** 하트 토글 (likes 서브컬렉션 + likeCount 트랜잭션) */
export async function toggleLike(postId, uid) {
  const postRef = doc(db, "community_posts", postId);
  const likeRef = doc(db, "community_posts", postId, "likes", uid);

  const liked = await runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likeCount: increment(-1) });
      return false; // unliked
    } else {
      tx.set(likeRef, { createdAt: serverTimestamp() });
      tx.update(postRef, { likeCount: increment(1) });
      return true; // liked
    }
  });

  // 좋아요 시 하트 달성 체크
  if (liked) {
    try {
      const postSnap = await getDoc(postRef);
      const postData = postSnap.data();
      if (postData?.authorUid) {
        const { checkAndGrantLikeMilestone } = await import("./PointService");
        await checkAndGrantLikeMilestone(
          postData.likeCount,
          postData.authorUid,
          postData.authorName || "사용자",
          postId
        );
      }
    } catch (e) {
      console.warn("하트 달성 포인트 체크 실패:", e.message);
    }
  }

  return liked;
}

/** 내가 좋아요 눌렀는지 확인 */
export async function checkLiked(postId, uid) {
  if (!uid) return false;
  const likeSnap = await getDoc(doc(db, "community_posts", postId, "likes", uid));
  return likeSnap.exists();
}

/** 댓글 목록 조회 (오래된 순) */
export async function getComments(postId) {
  const q = query(
    collection(db, "community_posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => !c.hidden);
}

/** 댓글/대댓글 추가 + commentCount 증가 */
export async function addComment(postId, { text, authorUid, authorName, parentId = null }) {
  const postRef = doc(db, "community_posts", postId);
  const commentsRef = collection(db, "community_posts", postId, "comments");

  const commentRef = await addDoc(commentsRef, {
    text,
    authorUid,
    authorName,
    parentId,
    createdAt: serverTimestamp(),
  });

  await updateDoc(postRef, { commentCount: increment(1) });
  return commentRef.id;
}

/** 이미지 업로드 (최대 5장) → URL 배열 반환 */
export async function uploadCommunityImages(files, postId) {
  const urls = [];
  const toUpload = files.slice(0, 5);
  for (const file of toUpload) {
    const storageRef = ref(storage, `community/${postId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
}
