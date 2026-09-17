/* eslint-disable */
/**
 * 커뮤니티 시안 — 목록 / 글 상세 (형 9/18)
 * 폭 390 실제 크기. 0번이 지금 화면.
 */
import React from "react";
import { IoChevronBack, IoHeartOutline, IoHeart, IoChatbubbleOutline, IoCreateOutline, IoSend, IoPersonCircle, IoEyeOutline } from "react-icons/io5";

const G = "#00963F";
const G_DEEP = "#007A33";
const G_TINT = "#E6F7EE";
const BTN = "#00B84A";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#E3E6EB";
const BG = "#F7F8FA";

const IMG1 = "linear-gradient(135deg,#3b3b3b,#bdbdbd)";
const IMG2 = "linear-gradient(135deg,#c9a24a,#efe2b8)";
const IMG3 = "linear-gradient(135deg,#2f5d50,#a9c7bd)";

const POSTS = [
  { cat: "현장팁", title: "특수청소 현장 팁 공유합니다", body: "화재 현장 그을음 제거는 알칼리 세정제부터 시작하는 게 정석이에요. 다들 어떻게 하시나요?", imgs: [IMG1, IMG2], date: "07.20", who: "용감한강아지", like: 12, cmt: 4, view: 186 },
  { cat: "질문", title: "누수탐지 비용 보통 얼마 정도 하나요?", body: "아파트 화장실 누수 같은데 탐지 비용 감이 안 잡히네요. 경험담 공유 부탁드립니다.", imgs: [IMG3], date: "07.19", who: "성실한청소부", like: 5, cmt: 9, view: 142 },
  { cat: "질문", title: "타일 줄눈 백시멘트 추천 부탁", body: "요즘 쓰는 백시멘트 브랜드 중에 변색 적은 거 추천 좀 해주세요.", imgs: [], date: "07.19", who: "노련한장인", like: 8, cmt: 6, view: 97 },
];

const Phone = ({ title = "커뮤니티", back = true, children, h = 760 }) => (
  <div style={{ position: "relative", width: 390, maxWidth: "100%", height: h, overflow: "hidden", background: BG, border: `1px solid ${LINE}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "#fff", borderBottom: "1px solid #EFF1F4" }}>
      {back && <IoChevronBack size={22} color={TXT} />}
      <span style={{ fontSize: 19, fontWeight: 700, color: TXT }}>{title}</span>
    </div>
    {children}
  </div>
);
const Tabs = ({ items = ["자유게시판", "이벤트/공지"], on = 0 }) => (
  <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #EFF1F4" }}>
    {items.map((t, i) => (
      <div key={t} style={{ flex: 1, textAlign: "center", padding: "13px 0", fontSize: 16, fontWeight: i === on ? 700 : 500, color: TXT, borderBottom: `3px solid ${i === on ? G : "transparent"}` }}>{t}</div>
    ))}
  </div>
);
const Thumb = ({ bg, size = 64, r = 10 }) => <div style={{ width: size, height: size, borderRadius: r, background: bg, flexShrink: 0 }} />;
const Meta = ({ p }) => (
  <span style={{ display: "flex", gap: 12, fontSize: 14, color: SUB }}>
    <span style={{ display: "flex", alignItems: "center", gap: 3 }}><IoHeartOutline size={15} />{p.like}</span>
    <span style={{ display: "flex", alignItems: "center", gap: 3 }}><IoChatbubbleOutline size={15} />{p.cmt}</span>
  </span>
);
const WriteFab = () => (
  <div style={{ position: "absolute", right: 16, bottom: 20, height: 50, padding: "0 18px", borderRadius: 12, background: BTN, color: "#fff", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 6px 16px rgba(0,0,0,0.16)" }}>
    <IoCreateOutline size={19} />글쓰기
  </div>
);

export const CommunityListCases = [
  {
    no: 0, name: "지금 화면", note: "글마다 둥근 카드 + '자유' 초록 뱃지. 본문이 한 줄에서 잘리고(…), 작성자가 맨 아래 따로 떨어져 있습니다.",
    render: () => (
      <Phone>
        <Tabs />
        <div style={{ padding: 12 }}>
          {POSTS.slice(0, 2).map((p) => (
            <div key={p.title} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 12 }}>
              <span style={{ fontSize: 13, background: BTN, color: "#fff", padding: "2px 8px", borderRadius: 6 }}>자유</span>
              <div style={{ fontSize: 17, fontWeight: 700, margin: "10px 0 6px" }}>{p.title}</div>
              <div style={{ fontSize: 15, color: SUB, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.body}</div>
              {p.imgs.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{p.imgs.map((b, i) => <Thumb key={i} bg={b} />)}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 14, color: SUB }}><span>2026.{p.date}</span><Meta p={p} /></div>
              <div style={{ fontSize: 14, marginTop: 4 }}>{p.who}</div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", right: 16, bottom: 20, padding: "12px 18px", borderRadius: 8, background: BTN, color: "#fff", fontSize: 16, fontWeight: 700 }}>게시글 쓰기</div>
      </Phone>
    ),
  },
  {
    no: 1, name: "카드 정리", note: "뱃지를 빼고(탭이 이미 말해 줌) 작성자·날짜를 제목 위 한 줄로 올립니다. 본문은 자르지 않고 두세 줄로 다 보여 줍니다.",
    render: () => (
      <Phone>
        <Tabs />
        <div style={{ padding: 12 }}>
          {POSTS.slice(0, 2).map((p) => (
            <div key={p.title} style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: SUB }}>{p.who} · {p.date}</div>
              <div style={{ fontSize: 17, fontWeight: 700, margin: "6px 0 6px", lineHeight: 1.4 }}>{p.title}</div>
              <div style={{ fontSize: 15, color: SUB, lineHeight: 1.55 }}>{p.body}</div>
              {p.imgs.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{p.imgs.map((b, i) => <Thumb key={i} bg={b} size={72} />)}</div>}
              <div style={{ marginTop: 12 }}><Meta p={p} /></div>
            </div>
          ))}
        </div>
        <WriteFab />
      </Phone>
    ),
  },
  {
    no: 2, name: "줄 목록 + 오른쪽 사진", note: "카드를 걷고 흰 바탕에 줄로 나눕니다. 사진은 오른쪽 작은 칸 하나. 한 화면에 글이 가장 많이 들어옵니다.",
    render: () => (
      <Phone>
        <Tabs />
        <div style={{ background: "#fff" }}>
          {POSTS.map((p) => (
            <div key={p.title} style={{ display: "flex", gap: 12, padding: "16px", borderBottom: "1px solid #EFF1F4" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{p.title}</div>
                <div style={{ fontSize: 14, color: SUB, lineHeight: 1.5, marginTop: 4 }}>{p.body}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, fontSize: 13, color: SUB }}>
                  <span>{p.who}</span><span>{p.date}</span><Meta p={p} />
                </div>
              </div>
              {p.imgs[0] && <Thumb bg={p.imgs[0]} size={76} />}
            </div>
          ))}
        </div>
        <WriteFab />
      </Phone>
    ),
  },
  {
    no: 3, name: "말머리로 거르기", note: "탭 밑에 현장팁·질문·구인·후기 말머리 줄을 둡니다. 글 제목 앞에는 말머리를 초록 글씨로만 붙입니다.",
    render: () => (
      <Phone>
        <Tabs />
        <div style={{ display: "flex", margin: "12px 12px 0", border: `1px solid ${LINE}`, background: "#fff" }}>
          {["전체", "현장팁", "질문", "구인", "후기"].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 0", fontSize: 15, fontWeight: i === 0 ? 700 : 500, background: i === 0 ? "#E9ECF1" : "#fff", borderLeft: i ? `1px solid ${LINE}` : "none" }}>{t}</div>
          ))}
        </div>
        <div style={{ background: "#fff", marginTop: 12 }}>
          {POSTS.map((p) => (
            <div key={p.title} style={{ display: "flex", gap: 12, padding: "16px", borderBottom: "1px solid #EFF1F4" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}><span style={{ color: G_DEEP }}>{p.cat}</span> {p.title}</div>
                <div style={{ fontSize: 14, color: SUB, lineHeight: 1.5, marginTop: 4 }}>{p.body}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, fontSize: 13, color: SUB }}>
                  <span>{p.who}</span><span>{p.date}</span><Meta p={p} />
                </div>
              </div>
              {p.imgs[0] && <Thumb bg={p.imgs[0]} size={76} />}
            </div>
          ))}
        </div>
        <WriteFab />
      </Phone>
    ),
  },
  {
    no: 4, name: "많이 본 글 먼저", note: "맨 위에 이번 주 많이 본 글 세 개를 번호로 짧게 보여 주고, 그 아래 최신 글을 이어 붙입니다.",
    render: () => (
      <Phone>
        <Tabs />
        <div style={{ background: "#fff", margin: 12, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>이번 주 많이 본 글</div>
          {POSTS.map((p, i) => (
            <div key={p.title} style={{ display: "flex", gap: 10, padding: "8px 0", fontSize: 15, borderTop: i ? "1px solid #F2F4F7" : "none" }}>
              <b style={{ color: G, width: 14 }}>{i + 1}</b><span style={{ flex: 1 }}>{p.title}</span><span style={{ fontSize: 13, color: SUB, display: "flex", alignItems: "center", gap: 3 }}><IoEyeOutline size={14} />{p.view}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, padding: "4px 16px 8px" }}>최신 글</div>
        <div style={{ background: "#fff" }}>
          {POSTS.slice(0, 2).map((p) => (
            <div key={p.title} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid #EFF1F4" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, fontSize: 13, color: SUB }}><span>{p.who}</span><span>{p.date}</span><Meta p={p} /></div>
              </div>
              {p.imgs[0] && <Thumb bg={p.imgs[0]} size={64} />}
            </div>
          ))}
        </div>
        <WriteFab />
      </Phone>
    ),
  },
  {
    no: 5, name: "사진 크게", note: "사진이 있는 글은 제목 밑에 사진을 넓게 보여 줍니다. 현장 사진 자랑·후기가 많을 때 어울립니다.",
    render: () => (
      <Phone>
        <Tabs />
        <div style={{ padding: 12 }}>
          {POSTS.slice(0, 2).map((p) => (
            <div key={p.title} style={{ background: "#fff", borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px 0" }}>
                <IoPersonCircle size={30} color="#C9CED6" />
                <div><div style={{ fontSize: 15, fontWeight: 700 }}>{p.who}</div><div style={{ fontSize: 13, color: SUB }}>{p.date}</div></div>
              </div>
              <div style={{ padding: "10px 16px 12px" }}>
                <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{p.title}</div>
                <div style={{ fontSize: 15, color: SUB, lineHeight: 1.5, marginTop: 4 }}>{p.body}</div>
              </div>
              {p.imgs[0] && <div style={{ height: 180, background: p.imgs[0] }} />}
              <div style={{ padding: "12px 16px" }}><Meta p={p} /></div>
            </div>
          ))}
        </div>
        <WriteFab />
      </Phone>
    ),
  },
];

const COMMENTS = [
  { who: "노련한장인", text: "저는 알칼리로 1차 하고 산성으로 마무리합니다. 벽지면 스펀지가 편해요.", t: "07.20" },
  { who: "든든한기술자", text: "천장 그을음은 드라이 스펀지 먼저 쓰면 번짐이 덜합니다.", t: "07.21" },
];
const CommentBar = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #EFF1F4", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
    <div style={{ flex: 1, height: 46, border: `1px solid ${LINE}`, borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 15, color: "#8A93A0" }}>댓글을 입력하세요</div>
    <div style={{ width: 46, height: 46, borderRadius: 10, background: BTN, display: "flex", alignItems: "center", justifyContent: "center" }}><IoSend size={19} color="#fff" /></div>
  </div>
);
const CommentList = () => (
  <div style={{ background: "#fff", padding: "4px 16px 90px" }}>
    <div style={{ fontSize: 16, fontWeight: 700, padding: "14px 0 6px" }}>댓글 4</div>
    {COMMENTS.map((c) => (
      <div key={c.who} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: "1px solid #F2F4F7" }}>
        <IoPersonCircle size={30} color="#C9CED6" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{c.who} <span style={{ fontWeight: 400, color: SUB, fontSize: 13 }}>{c.t}</span></div>
          <div style={{ fontSize: 15, lineHeight: 1.5, marginTop: 2 }}>{c.text}</div>
        </div>
      </div>
    ))}
  </div>
);

export const CommunityDetailCases = [
  {
    no: 0, name: "지금 화면", note: "뱃지·날짜·작성자·제목이 위에 따로따로 쌓이고, 사진이 세로로 크게 이어집니다. 좋아요 누르는 곳이 잘 안 보입니다.",
    render: () => (
      <Phone>
        <div style={{ background: "#fff", padding: 16, height: "100%" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: SUB }}><span style={{ fontSize: 13, background: G_TINT, color: G, padding: "2px 7px", borderRadius: 6 }}>자유</span>2026.07.20</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>용감한강아지</div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: "12px 0" }}>특수청소 현장 팁 공유합니다</div>
          <div style={{ fontSize: 16, lineHeight: 1.6 }}>{POSTS[0].body}</div>
          <div style={{ height: 300, borderRadius: 10, background: IMG1, marginTop: 20 }} />
          <div style={{ height: 200, borderRadius: 10, background: IMG2, marginTop: 10 }} />
        </div>
        <CommentBar />
      </Phone>
    ),
  },
  {
    no: 1, name: "작성자 줄 + 반응 줄", note: "맨 위에 프로필·작성자·날짜를 한 줄로, 본문 뒤 사진은 가로로 넘겨 보게 하고, 좋아요·댓글 수를 한 줄로 둔 뒤 댓글을 바로 잇습니다.",
    render: () => (
      <Phone>
        <div style={{ background: "#fff", padding: "16px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IoPersonCircle size={40} color="#C9CED6" />
            <div><div style={{ fontSize: 16, fontWeight: 700 }}>용감한강아지</div><div style={{ fontSize: 13, color: SUB }}>2026.07.20 · 조회 186</div></div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 8px", lineHeight: 1.4 }}>특수청소 현장 팁 공유합니다</div>
          <div style={{ fontSize: 16, lineHeight: 1.6 }}>{POSTS[0].body}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div style={{ width: 250, height: 190, borderRadius: 10, background: IMG1, flexShrink: 0 }} />
            <div style={{ width: 120, height: 190, borderRadius: 10, background: IMG2, flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 16, padding: "14px 0", marginTop: 12, borderTop: "1px solid #F2F4F7", fontSize: 15 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IoHeartOutline size={19} />좋아요 12</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IoChatbubbleOutline size={18} />댓글 4</span>
          </div>
        </div>
        <div style={{ height: 8 }} />
        <CommentList />
        <CommentBar />
      </Phone>
    ),
  },
  {
    no: 2, name: "좋아요 버튼 크게", note: "본문 끝에 [좋아요] 버튼을 넓게 두어 누를 곳을 분명히 합니다. 누르면 초록으로 채워집니다.",
    render: () => (
      <Phone>
        <div style={{ background: "#fff", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IoPersonCircle size={40} color="#C9CED6" />
            <div><div style={{ fontSize: 16, fontWeight: 700 }}>용감한강아지</div><div style={{ fontSize: 13, color: SUB }}>2026.07.20</div></div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 8px" }}>특수청소 현장 팁 공유합니다</div>
          <div style={{ fontSize: 16, lineHeight: 1.6 }}>{POSTS[0].body}</div>
          <div style={{ height: 180, borderRadius: 10, background: IMG1, marginTop: 14 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <div style={{ flex: 1, height: 48, borderRadius: 10, border: `1px solid ${G}`, color: G_DEEP, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><IoHeart size={19} color={G} />좋아요 12</div>
            <div style={{ flex: 1, height: 48, borderRadius: 10, border: `1px solid ${LINE}`, fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><IoChatbubbleOutline size={18} />댓글 4</div>
          </div>
        </div>
        <div style={{ height: 8 }} />
        <CommentList />
        <CommentBar />
      </Phone>
    ),
  },
];
