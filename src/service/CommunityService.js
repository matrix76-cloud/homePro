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

/** 게시글 목록 조회 (type별, 최신순, 최대 20건) */
export async function getPosts(type) {
  const q = query(postsRef, where("type", "==", type), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 게시글 상세 조회 */
export async function getPostById(postId) {
  const snap = await getDoc(doc(db, "community_posts", postId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
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
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
