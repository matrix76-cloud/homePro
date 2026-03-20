/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoHeartOutline, IoChatbubbleOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { getPosts } from "../../service/CommunityService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const TABS = ["이벤트/공지", "자유게시판"];

const DEFAULT_NOTICES = [
  {
    id: "default_1",
    type: "notice",
    title: "홈프로 오픈 기념 이벤트!",
    content: "지금 가입하면 첫 오더 수수료 무료",
    likeCount: 0,
    commentCount: 0,
    createdAt: { toDate: () => new Date("2026-02-08") },
    authorName: "홈프로 운영팀",
  },
  {
    id: "default_2",
    type: "notice",
    title: "추천인 보상 프로그램 안내",
    content: "친구를 초대하고 캐시를 받으세요",
    likeCount: 0,
    commentCount: 0,
    createdAt: { toDate: () => new Date("2026-02-08") },
    authorName: "홈프로 운영팀",
  },
  {
    id: "default_3",
    type: "notice",
    title: "프로필 완성도 높이는 법",
    content: "완성도가 높을수록 고객 매칭률 UP",
    likeCount: 0,
    commentCount: 0,
    createdAt: { toDate: () => new Date("2026-02-08") },
    authorName: "홈프로 운영팀",
  },
];

const CommunityPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("이벤트/공지");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const type = activeTab === "이벤트/공지" ? "notice" : "free";

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    getPosts(type)
      .then((result) => {
        if (type === "notice" && result.length === 0) {
          setPosts(DEFAULT_NOTICES);
        } else {
          setPosts(result);
        }
      })
      .catch((err) => {
        console.error(err);
        if (type === "notice") setPosts(DEFAULT_NOTICES);
        else setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [type]);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <SimpleBackLayout NAME="게시판" hideFooter>
      <PageWrap>
        <TabRow>
          {TABS.map((tab) => (
            <Tab key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </Tab>
          ))}
        </TabRow>

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
    </SimpleBackLayout>
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

const TabRow = styled.div`
  display: flex;
  border-bottom: 2px solid ${THEME.border};
  padding: 0 12px;
  background: ${THEME.surface};
`;

const Tab = styled.div`
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 15px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  margin-bottom: -2px;
  cursor: pointer;
  &:active { opacity: 0.7; }
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
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
  font-size: 11px;
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

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
`;

const PostDate = styled.div`
  font-size: 12px;
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
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const AuthorName = styled.div`
  font-size: 12px;
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
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const WriteBtn = styled.button`
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: calc(50% - 180px);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 24px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(124, 92, 252, 0.4);
  cursor: pointer;
  z-index: 100;
  &:active { opacity: 0.85; }
`;
