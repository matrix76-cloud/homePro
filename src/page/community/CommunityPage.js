/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoHeartOutline, IoChatbubbleOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { getPosts } from "../../service/CommunityService";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import Tabs from "../../common/Tabs";

const TABS = ["자유게시판", "이벤트/공지"];

// (전수검사 7/29 제거) DEFAULT_NOTICES — 실체 없는 하드코딩 이벤트 안내

const CommunityPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("자유게시판");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const type = activeTab === "이벤트/공지" ? "notice" : "free";

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    getPosts(type)
      // (전수검사 7/29) 가짜 공지 폴백 제거 — "오픈 기념 이벤트" 같은 실체 없는
      // 이벤트 안내가 하드코딩으로 노출되고 있었음. 없으면 빈 상태로 정직하게.
      .then((result) => setPosts(result))
      .catch((err) => {
        console.error(err);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [type]);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <MainListLayout NAME="커뮤니티" hideFooter>
      <PageWrap>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {loading ? (
          <EmptyWrap><EmptyText>불러오는 중...</EmptyText></EmptyWrap>
        ) : posts.length === 0 ? (
          <EmptyWrap><EmptyText>게시글이 없습니다</EmptyText></EmptyWrap>
        ) : (
          <ListWrap>
            {posts.map((post) => (
              <PostCard key={post.id} onClick={() => !post.id.startsWith("default_") && navigate(`/community/${post.id}`)}>
                <PostBadge>{activeTab === "이벤트/공지" ? "이벤트/공지" : "자유"}</PostBadge>
                <PostTitle>{post.title}</PostTitle>
                <PostContent>{post.content}</PostContent>
                {post.images && post.images.length > 0 && (
                  <ThumbRow>
                    {post.images.slice(0, 3).map((url, i) => (
                      <Thumb key={i}>
                        <ThumbImg src={url} alt="" />
                        {i === 2 && post.images.length > 3 && (
                          <ThumbMore>+{post.images.length - 3}</ThumbMore>
                        )}
                      </Thumb>
                    ))}
                  </ThumbRow>
                )}
                <PostFooter>
                  <PostDate>{formatDate(post.createdAt)}</PostDate>
                  {type === "free" && (
                    <PostMeta>
                      <MetaItem><IoHeartOutline size={14} color={THEME.muted} />{post.likeCount || 0}</MetaItem>
                      <MetaItem><IoChatbubbleOutline size={14} color={THEME.muted} />{post.commentCount || 0}</MetaItem>
                    </PostMeta>
                  )}
                </PostFooter>
                {type === "free" && post.authorName && (
                  <AuthorName>{post.authorName}</AuthorName>
                )}
              </PostCard>
            ))}
          </ListWrap>
        )}

        {type === "free" && (
          <WriteBtn onClick={() => navigate("/community/write")}>
            게시글 쓰기
          </WriteBtn>
        )}
      </PageWrap>
    </MainListLayout>
  );
};

export default CommunityPage;

/* ===================== Styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.background};
  position: relative;
`;

const ListWrap = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PostCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const PostBadge = styled.div`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 20px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 400;
  margin-bottom: 10px;
`;

const PostTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
  line-height: 1.4;
  letter-spacing: -0.02em;
`;

const PostContent = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 6px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ThumbRow = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 12px;
`;

const Thumb = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: ${THEME.background};
`;

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ThumbMore = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
`;

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
`;

const PostDate = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const AuthorName = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
`;

const EmptyWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
`;

const EmptyText = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const WriteBtn = styled.button`
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  right: calc(50% - 163px);
  padding: 10px 18px;
  border-radius: 4px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(37, 113, 227, 0.4);
  cursor: pointer;
  z-index: 100;
  &:active { opacity: 0.85; }
`;
