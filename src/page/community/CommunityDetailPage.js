/* eslint-disable */
import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoHeartOutline, IoHeart, IoSendOutline, IoChatbubbleOutline, IoPersonCircle, IoEllipsisHorizontal } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { getPostById, toggleLike, checkLiked, getComments, addComment, increaseViewCount, getPosts } from "../../service/CommunityService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import usePcWide from "../../hooks/usePcWide";
import ReportSheet from "../../components/ReportSheet";
import { getMyBlocks } from "../../service/BlockService";

const CommunityDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  // 새로고침·직접 진입 시 UserContext 가 비어 좋아요·댓글이 조용히 무시되던
  // 문제 — 글쓰기와 동일하게 AuthContext 폴백 (심화점검 10 발견)
  const uid = userData?.uid || user?.USERS_ID;
  const nickname = userData?.nickname || userData?.name || user?.USERINFO?.nickname || "익명";

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, authorName }
  const [loading, setLoading] = useState(true);
  const commentInputRef = useRef(null);
  const pcWide = usePcWide();
  const [related, setRelated] = useState([]);   // PC 오른쪽 단 "다른 글" — 읽기만 한다
  // 신고 · 거부 등록 (애플 심사 1.2) — 남의 글·댓글 옆 더보기에서 연다. 거부한 사용자의 글·댓글은 가린다
  const [sheetTarget, setSheetTarget] = useState(null);
  const [blockedUids, setBlockedUids] = useState([]);
  const [toast, setToast] = useState("");
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getMyBlocks(uid).then((list) => { if (alive) setBlockedUids(list.map((b) => b.blockedUid)); }).catch(() => {});
    return () => { alive = false; };
  }, [uid]);

  const handleBlocked = (t) => {
    setBlockedUids((prev) => [...prev, t.targetUid]);
    // 글쓴이를 거부했으면 이 글 자체가 안 보여야 하므로 목록으로 돌아간다
    if (post?.authorUid && t.targetUid === post.authorUid) setTimeout(() => navigate(-1), 900);
  };

  useEffect(() => {
    if (!pcWide || !post) return;
    let alive = true;
    getPosts(post.type || "free")
      .then((list) => { if (alive) setRelated(list.filter((x) => x.id !== post.id).slice(0, 6)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [pcWide, post?.id, post?.type]);

  // 조회수 — 글을 열 때 한 번 (많이 본 글 순위용)
  useEffect(() => { if (postId) increaseViewCount(postId); }, [postId]);

  useEffect(() => {
    if (!postId) return;
    Promise.all([
      getPostById(postId),
      checkLiked(postId, uid),
      getComments(postId),
    ]).then(([p, isLiked, cmts]) => {
      if (!p) { navigate(-1); return; }
      setPost(p);
      setLiked(isLiked);
      setLikeCount(p.likeCount || 0);
      setComments(cmts);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [postId, uid]);

  const handleLike = async () => {
    if (!uid) return;
    const result = await toggleLike(postId, uid);
    setLiked(result);
    setLikeCount((prev) => (result ? prev + 1 : prev - 1));
  };

  // 댓글 전송 잠금 — 저장이 끝나기 전 Enter·버튼을 또 누르면 같은 댓글이 두 번 달리고 commentCount 가 +2 됐다
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    if (!uid) { showToast("로그인이 필요합니다"); return; }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    // 입력칸은 먼저 비우고, 실패하면 되돌린다
    const prevText = commentText;
    const prevReply = replyTo;
    setCommentText("");
    setReplyTo(null);
    try {
      await addComment(postId, {
        text,
        authorUid: uid,
        authorName: nickname,
        parentId: prevReply?.id || null,
      });
      setPost((prev) => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev);
      // 댓글 목록 새로고침 — 실패해도 등록은 된 것이라 조용히 넘어간다
      try {
        const cmts = await getComments(postId);
        setComments(cmts);
      } catch (e) { console.warn("댓글 목록 새로고침 실패:", e); }
    } catch (e) {
      console.error("댓글 등록 실패:", e);
      setCommentText(prevText);
      setReplyTo(prevReply);
      showToast("댓글을 등록하지 못했습니다. 다시 시도해 주세요");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 댓글을 부모-자식 구조로 정리
  const visibleComments = comments.filter((c) => !blockedUids.includes(c.authorUid));
  const rootComments = visibleComments.filter((c) => !c.parentId);
  const childMap = {};
  visibleComments.filter((c) => c.parentId).forEach((c) => {
    if (!childMap[c.parentId]) childMap[c.parentId] = [];
    childMap[c.parentId].push(c);
  });

  if (loading) {
    return (
      <SimpleBackLayout NAME="커뮤니티" hideFooter>
        <LoadingWrap>불러오는 중...</LoadingWrap>
      </SimpleBackLayout>
    );
  }

  if (!post) return null;

  const canActOnPost = !!uid && post.type !== "notice" && !!post.authorUid && post.authorUid !== uid;
  const openPostSheet = () => setSheetTarget({
    type: "post", postId: post.id, targetUid: post.authorUid, targetName: post.authorName || "",
    snippet: `${post.title || ""}\n${post.content || ""}`,
  });
  const openCommentSheet = (c) => setSheetTarget({
    type: "comment", postId: post.id, commentId: c.id, targetUid: c.authorUid || null, targetName: c.authorName || "",
    snippet: c.text || "",
  });
  const canActOnComment = (c) => !!uid && c.authorUid !== uid;

  return (
    <SimpleBackLayout NAME="커뮤니티" hideFooter>
      <PageWrap>
        <ContentArea>
          {/* 작성자 줄 (커뮤니티 시안 2번, 형 9/18) */}
          <AuthorLine>
            <IoPersonCircle size={40} color="#C9CED6" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <AuthorName>{post.authorName || (post.type === "notice" ? "홈프로" : "익명")}</AuthorName>
              <AuthorSub>
                {post.type === "notice" ? "이벤트/공지 · " : ""}{formatDate(post.createdAt)}{post.viewCount ? ` · 조회 ${post.viewCount}` : ""}
              </AuthorSub>
            </div>
            {canActOnPost && (
              <MoreBtn type="button" aria-label="신고 · 거부 등록" onClick={openPostSheet}>
                <IoEllipsisHorizontal size={22} color={THEME.text} />
              </MoreBtn>
            )}
          </AuthorLine>

          {/* 본문 */}
          <Title>{post.title}</Title>
          <Content>{post.content}</Content>

          {/* 이미지 */}
          {post.images && post.images.length > 0 && (
            <ImageList>
              {post.images.map((url, i) => (
                <PostImage key={i} src={url} alt={`이미지 ${i + 1}`} />
              ))}
            </ImageList>
          )}

          {/* 좋아요 · 댓글 버튼 (시안 2번) */}
          <ActionRow>
            <ActionBtn type="button" $on={liked} onClick={handleLike}>
              {liked ? <IoHeart size={20} color={THEME.primary} /> : <IoHeartOutline size={20} color={THEME.text} />}
              좋아요 {likeCount}
            </ActionBtn>
            <ActionBtn type="button" onClick={() => commentInputRef.current?.focus()}>
              <IoChatbubbleOutline size={19} color={THEME.text} />
              댓글 {post.commentCount || 0}
            </ActionBtn>
          </ActionRow>

          {/* 댓글 섹션 */}
          <CommentSection>
            <CommentTitle>댓글 {post.commentCount || 0}</CommentTitle>
            {rootComments.length === 0 ? (
              <CommentEmpty>첫 댓글을 남겨보세요</CommentEmpty>
            ) : (
              rootComments.map((c) => (
                <React.Fragment key={c.id}>
                  <CommentItem>
                    <CommentAuthor>{c.authorName}</CommentAuthor>
                    <CommentText>{c.text}</CommentText>
                    <CommentMeta>
                      <CommentDate>{formatDate(c.createdAt)}</CommentDate>
                      <ReplyBtn onClick={() => setReplyTo({ id: c.id, authorName: c.authorName })}>답글</ReplyBtn>
                      {canActOnComment(c) && <ReportBtn type="button" onClick={() => openCommentSheet(c)}>신고</ReportBtn>}
                    </CommentMeta>
                  </CommentItem>
                  {/* 대댓글 */}
                  {childMap[c.id]?.map((reply) => (
                    <CommentItem key={reply.id} $isReply>
                      <CommentAuthor>{reply.authorName}</CommentAuthor>
                      <CommentText>{reply.text}</CommentText>
                      <CommentMeta>
                        <CommentDate>{formatDate(reply.createdAt)}</CommentDate>
                        {canActOnComment(reply) && <ReportBtn type="button" onClick={() => openCommentSheet(reply)}>신고</ReportBtn>}
                      </CommentMeta>
                    </CommentItem>
                  ))}
                </React.Fragment>
              ))
            )}
          </CommentSection>
        </ContentArea>

        {/* 댓글 입력창 (고정) */}
        <InputBar>
          {replyTo && (
            <ReplyIndicator>
              <span>{replyTo.authorName}에게 답글</span>
              <CancelReply onClick={() => setReplyTo(null)}>취소</CancelReply>
            </ReplyIndicator>
          )}
          <InputRow>
            <CommentInput
              ref={commentInputRef}
              placeholder="댓글을 입력하세요"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.nativeEvent.isComposing || e.keyCode === 229) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
            />
            <SendBtn onClick={handleAddComment} disabled={!commentText.trim() || sending}>
              <IoSendOutline size={20} color={commentText.trim() ? THEME.primary : THEME.muted} />
            </SendBtn>
          </InputRow>
        </InputBar>

        {pcWide && (
          <PcSide>
            <PcSideCard>
              <h2>작성자</h2>
              <PcAuthor>
                <IoPersonCircle size={44} color="#C9CED6" />
                <div>
                  <b>{post.authorName || (post.type === "notice" ? "홈프로" : "익명")}</b>
                  <span>{formatDate(post.createdAt)} 작성</span>
                </div>
              </PcAuthor>
              <PcFacts>
                <div><span>조회</span><b>{post.viewCount || 0}</b></div>
                <div><span>좋아요</span><b>{likeCount}</b></div>
                <div><span>댓글</span><b>{post.commentCount || 0}</b></div>
              </PcFacts>
              <PcListBtn type="button" onClick={() => navigate("/community")}>목록으로</PcListBtn>
            </PcSideCard>
            <PcSideCard>
              <h2>{post.type === "notice" ? "다른 공지" : "다른 글"}</h2>
              {related.length === 0 ? <PcNone>다른 글이 없습니다.</PcNone> : related.map((r) => (
                <PcRelRow key={r.id} onClick={() => navigate(`/community/${r.id}`)}>
                  <b>{r.title}</b>
                  <span>{r.authorName ? `${r.authorName} · ` : ""}{formatDate(r.createdAt)}</span>
                </PcRelRow>
              ))}
            </PcSideCard>
          </PcSide>
        )}
      </PageWrap>

      {sheetTarget && (
        <ReportSheet
          target={sheetTarget}
          myUid={uid}
          onClose={() => setSheetTarget(null)}
          onBlocked={handleBlocked}
          showToast={showToast}
        />
      )}
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default CommunityDetailPage;

/* ===================== Styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.surface};
  /* PC — 본문 단(760) · 오른쪽 작성자/다른 글(320). 댓글 입력칸은 바닥 고정 대신 본문 단 아래에 놓는다 */
  .pc-mode & {
    background: #F7F8FA; padding: 30px 32px 80px; box-sizing: border-box;
    display: grid; grid-template-columns: minmax(0, 760px) 320px; grid-template-rows: auto auto 1fr; gap: 0 24px; align-items: start;
    @media (max-width: 1240px) { grid-template-columns: minmax(0, 760px); }
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px 16px;
  padding-bottom: 80px;
  .pc-mode & { grid-column: 1; grid-row: 1; background: #fff; border: 1px solid #dfe3e8; border-bottom: none; padding: 32px 36px 28px; }
`;

/* ===== PC 전용 ===== */
const PcSide = styled.div`
  grid-column: 2; grid-row: 1 / span 3; position: sticky; top: 24px; display: flex; flex-direction: column; gap: 20px; min-width: 0; color: #14181F; word-break: keep-all;
  @media (max-width: 1240px) { grid-column: 1; grid-row: auto; position: static; margin-top: 24px; }
`;
const PcSideCard = styled.section` background: #fff; border: 1px solid #dfe3e8; padding: 22px 24px; h2 { font-size: 18px; font-weight: 800; margin: 0 0 14px; } `;
const PcAuthor = styled.div` display: flex; align-items: center; gap: 12px; div { display: grid; gap: 3px; } b { font-size: 16px; font-weight: 700; } span { font-size: 14px; color: #2b2f36; } `;
const PcFacts = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 16px; border: 1px solid #dfe3e8;
  div { display: flex; justify-content: space-between; gap: 6px; padding: 10px 12px; font-size: 14px; } div + div { border-left: 1px solid #dfe3e8; } b { font-weight: 700; }
`;
const PcListBtn = styled.button`
  margin-top: 16px; border: 1px solid #dfe3e8; background: #fff; color: #14181F; border-radius: 10px; padding: 11px 18px; cursor: pointer;
  font-size: 15px; font-weight: 700; font-family: inherit; &:hover { border-color: #14181F; }
`;
const PcRelRow = styled.div`
  display: grid; gap: 4px; padding: 13px 0; border-top: 1px solid #dfe3e8; cursor: pointer;
  b { font-size: 15px; font-weight: 700; line-height: 1.45; } span { font-size: 14px; color: #2b2f36; } &:hover b { text-decoration: underline; }
`;
const PcNone = styled.div` font-size: 15px; padding: 8px 0 4px; `;

const AuthorLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MoreBtn = styled.button`
  width: 44px; height: 44px; margin-right: -10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer;
  &:active { opacity: 0.6; }
`;

const ReportBtn = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const Toast = styled.div`
  position: fixed; left: 50%; bottom: 16vh; transform: translateX(-50%);
  max-width: calc(var(--app-max, 400px) - 48px); width: max-content;
  background: #1b1f27; color: #fff; padding: 12px 18px; border-radius: 10px;
  font-size: 15px; line-height: 1.45; text-align: center; word-break: keep-all; z-index: 1100;
`;

const AuthorName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const AuthorSub = styled.div`
  font-size: 13px;
  color: #2b2f36;
  margin-top: 1px;
`;

const Title = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: ${THEME.text};
  margin-top: 16px;
  line-height: 1.4;
  letter-spacing: -0.03em;
  .pc-mode & { font-size: 26px; font-weight: 800; margin-top: 22px; word-break: keep-all; }
`;

const Content = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 12px;
  line-height: 1.7;
  white-space: pre-line;
  .pc-mode & { color: #2b2f36; margin-top: 18px; line-height: 1.8; word-break: keep-all; }
`;

const ImageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
`;

const PostImage = styled.img`
  width: 100%;
  border-radius: 10px;
  object-fit: cover;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-bottom: 20px;
  border-bottom: 8px solid ${THEME.background};
  margin-left: -16px;
  margin-right: -16px;
  padding-left: 16px;
  padding-right: 16px;
  .pc-mode & { margin: 28px 0 0; padding: 0 0 26px; border-bottom: 1px solid #dfe3e8; }
`;

const ActionBtn = styled.button`
  flex: 1;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid ${({ $on }) => ($on ? THEME.primary : "#D9DDE3")};
  background: #fff;
  color: ${({ $on }) => ($on ? THEME.primaryDark : THEME.text)};
  font-size: 16px;
  font-weight: ${({ $on }) => ($on ? 700 : 600)};
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.7; }
  .pc-mode & { flex: none; padding: 0 22px; &:hover { border-color: #14181F; } }
`;

const CommentSection = styled.div`
  margin-top: 20px;
`;

const CommentTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 16px;
`;

const CommentEmpty = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.muted};
  text-align: center;
  padding: 20px 0;
  .pc-mode & { color: #14181F; text-align: left; }
`;

const CommentItem = styled.div`
  padding: ${({ $isReply }) => ($isReply ? "12px 0 12px 40px" : "12px 0")};
  border-bottom: 1px solid ${THEME.border};
`;

const CommentAuthor = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CommentText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 4px;
  line-height: 1.4;
  .pc-mode & { color: #2b2f36; line-height: 1.6; }
`;

const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
`;

const CommentDate = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  .pc-mode & { color: #2b2f36; }
`;

const ReplyBtn = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.primary};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const InputBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--app-max, 400px);
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  z-index: 100;
  .pc-mode & { position: static; transform: none; max-width: none; grid-column: 1; grid-row: 2; border: 1px solid #dfe3e8; z-index: auto; }
`;

const ReplyIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: ${THEME.background};
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.primary};
`;

const CancelReply = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.muted};
  background: none;
  border: none;
  cursor: pointer;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  .pc-mode & { padding: 16px 36px; }
`;

const CommentInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1.5px solid ${THEME.border};
  background: ${THEME.background};
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;

const SendBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.6; }
  &:disabled { opacity: 0.5; cursor: default; }
  .pc-mode & { width: 46px; height: 46px; border-radius: 10px; border: 1px solid #dfe3e8; background: #fff; }
`;

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  font-size: 17px;
  color: ${THEME.muted};
`;
