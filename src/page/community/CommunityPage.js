/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoHeartOutline, IoChatbubbleOutline, IoEyeOutline, IoCreateOutline } from "react-icons/io5";
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

  // 많이 본 글 3개 — 이번 주 글이 3개 미만이면 받아온 글 전체에서 고른다 (시안 4번, 형 9/18)
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const toMs = (ts) => (ts?.toMillis ? ts.toMillis() : ts ? new Date(ts).getTime() : 0);
  const weekPosts = posts.filter((p) => Date.now() - toMs(p.createdAt) < WEEK_MS);
  const popularPool = weekPosts.length >= 3 ? weekPosts : posts;
  const popularTitle = weekPosts.length >= 3 ? "이번 주 많이 본 글" : "많이 본 글";
  const score = (p) => (p.viewCount || 0) * 1000 + (p.likeCount || 0) + (p.commentCount || 0);
  const popular = type === "free" && posts.length >= 4
    ? [...popularPool].sort((x, y) => score(y) - score(x)).slice(0, 3)
    : [];

  const goPost = (post) => !post.id.startsWith("default_") && navigate(`/community/${post.id}`);

  return (
    <MainListLayout NAME="커뮤니티" hideFooter>
      <PageWrap>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {loading ? (
          <EmptyWrap><EmptyText>불러오는 중...</EmptyText></EmptyWrap>
        ) : posts.length === 0 ? (
          <EmptyWrap><EmptyText>게시글이 없습니다</EmptyText></EmptyWrap>
        ) : (
          <>
            {popular.length > 0 && (
              <PopularCard>
                <PopularTitle>{popularTitle}</PopularTitle>
                {popular.map((post, i) => (
                  <PopularRow key={post.id} onClick={() => goPost(post)}>
                    <PopularNo>{i + 1}</PopularNo>
                    <PopularText>{post.title}</PopularText>
                    <PopularView>
                      {post.viewCount ? <><IoEyeOutline size={15} />{post.viewCount}</> : <><IoHeartOutline size={15} />{post.likeCount || 0}</>}
                    </PopularView>
                  </PopularRow>
                ))}
              </PopularCard>
            )}
            {popular.length > 0 && <SectionLabel>최신 글</SectionLabel>}
            <ListWrap>
              {posts.map((post) => (
                <PostRow key={post.id} onClick={() => goPost(post)}>
                  <PostMain>
                    <PostTitle>{post.title}</PostTitle>
                    <PostInfo>
                      {post.authorName && <span>{post.authorName}</span>}
                      <span>{formatDate(post.createdAt)}</span>
                      {type === "free" && (
                        <>
                          <MetaItem><IoHeartOutline size={15} />{post.likeCount || 0}</MetaItem>
                          <MetaItem><IoChatbubbleOutline size={15} />{post.commentCount || 0}</MetaItem>
                        </>
                      )}
                    </PostInfo>
                  </PostMain>
                  {post.images && post.images.length > 0 && (
                    <Thumb>
                      <ThumbImg src={post.images[0]} alt="" />
                      {post.images.length > 1 && <ThumbMore>+{post.images.length - 1}</ThumbMore>}
                    </Thumb>
                  )}
                </PostRow>
              ))}
            </ListWrap>
          </>
        )}

        {type === "free" && (
          <WriteBtn onClick={() => navigate("/community/write")}>
            <IoCreateOutline size={19} />글쓰기
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

const PopularCard = styled.div`
  margin: 12px 12px 0;
  padding: 14px 16px 6px;
  background: ${THEME.surface};
  border-radius: 14px;
`;

const PopularTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 4px;
`;

const PopularRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  cursor: pointer;
  & + & { border-top: 1px solid #F2F4F7; }
`;

const PopularNo = styled.span`
  width: 16px;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 800;
  color: ${THEME.primary};
`;

const PopularText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: ${THEME.text};
  line-height: 1.4;
  word-break: keep-all;
`;

const PopularView = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: #2b2f36;
`;

const SectionLabel = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  padding: 18px 16px 8px;
`;

const ListWrap = styled.div`
  background: ${THEME.surface};
  margin-top: 0;
  padding-bottom: 90px;
`;

const PostRow = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #EFF1F4;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const PostMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const PostTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.4;
  word-break: keep-all;
`;

const PostInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin-top: 6px;
  font-size: 13px;
  color: #2b2f36;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
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
  right: 0;
  bottom: 0;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px 0 0 0;
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
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  right: calc(50% - 184px);
  display: flex;
  align-items: center;
  gap: 6px;
  height: 50px;
  padding: 0 18px;
  border-radius: 12px;
  border: none;
  background: ${THEME.button};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  cursor: pointer;
  z-index: 100;
  &:active { opacity: 0.85; }
  @media (max-width: 400px) { right: 16px; }
`;
