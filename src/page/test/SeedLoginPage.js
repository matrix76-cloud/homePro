/* eslint-disable */
/**
 * 시드 계정 로그인 페이지 (개발/테스트 전용)
 * URL: /seed-login
 *
 * 1. 함수 URL 입력 (한 번 입력하면 localStorage 저장)
 * 2. 시드 계정 카드 클릭 → customToken 받아서 signInWithCustomToken
 * 3. 메인으로 자동 이동
 *
 * 보안: secret 토큰이 클라이언트에 노출되므로 테스트 후 함수 삭제 권장
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../../api/config";

const SECRET = "homepro-seed-2026-x9k3p";
const DEFAULT_FN_URL = "https://asia-northeast3-homepro-43f7f.cloudfunctions.net/getSeedLoginToken";
const FN_URL_KEY = "homepro.seedLoginFnUrl";

const ACCOUNTS = [
  { id: "A1", uid: "seed_A1", nickname: "성실한청소부", role: "의뢰자", region: "서울 강남구" },
  { id: "A2", uid: "seed_A2", nickname: "부지런한사장", role: "의뢰자", region: "부산 해운대구" },
  { id: "A3", uid: "seed_A3", nickname: "똑똑한대표", role: "의뢰자", region: "대전 서구" },
  { id: "A4", uid: "seed_A4", nickname: "친절한매니저", role: "의뢰자", region: "충남 논산시" },
  { id: "A5", uid: "seed_A5", nickname: "빠른오너", role: "의뢰자", region: "충북 청주 상당구" },
  { id: "B1", uid: "seed_B1", nickname: "용감한강아지", role: "홈프로", region: "서울 마포구" },
  { id: "B2", uid: "seed_B2", nickname: "든든한기술자", role: "홈프로", region: "서울 강서구" },
  { id: "B3", uid: "seed_B3", nickname: "노련한장인", role: "홈프로", region: "광주 광산구" },
  { id: "B4", uid: "seed_B4", nickname: "정직한작업자", role: "홈프로 (지정배정)", region: "경기 수원 영통" },
  { id: "B5", uid: "seed_B5", nickname: "성실프로A", role: "홈프로(지원자풀)", region: "서울 송파구" },
  { id: "B6", uid: "seed_B6", nickname: "성실프로B", role: "홈프로(지원자풀)", region: "부산 부산진구" },
  { id: "B7", uid: "seed_B7", nickname: "성실프로C", role: "홈프로(지원자풀)", region: "대구 수성구" },
  { id: "B8", uid: "seed_B8", nickname: "성실프로D", role: "홈프로(지원자풀)", region: "인천 남동구" },
  { id: "B9", uid: "seed_B9", nickname: "성실프로E", role: "홈프로(지원자풀)", region: "울산 남구" },
];

const SeedLoginPage = () => {
  const navigate = useNavigate();
  const [fnUrl, setFnUrl] = useState(() => localStorage.getItem(FN_URL_KEY) || DEFAULT_FN_URL);
  const [busyUid, setBusyUid] = useState(null);
  const [error, setError] = useState("");

  const saveUrl = () => {
    localStorage.setItem(FN_URL_KEY, fnUrl.trim());
    setError("저장됨");
    setTimeout(() => setError(""), 1500);
  };

  const loginAs = async (uid) => {
    setError("");
    if (!fnUrl) { setError("먼저 함수 URL을 입력해주세요"); return; }
    setBusyUid(uid);
    try {
      const url = `${fnUrl.replace(/\/$/, "")}?uid=${encodeURIComponent(uid)}&secret=${SECRET}`;
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok || !j.token) throw new Error(j.error || "토큰 발급 실패");
      await signInWithCustomToken(auth, j.token);
      navigate("/MobileMain");
    } catch (e) {
      setError(e.message || "로그인 실패");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <Wrap>
      <Header>
        <Title>시드 계정 로그인</Title>
        <Sub>개발 테스트 전용 — Cloud Function URL 입력 후 카드 클릭</Sub>
      </Header>

      <UrlBox>
        <UrlLabel>getSeedLoginToken 함수 URL</UrlLabel>
        <UrlRow>
          <UrlInput
            placeholder="https://getseedlogintoken-XXXX-du.a.run.app"
            value={fnUrl}
            onChange={(e) => setFnUrl(e.target.value)}
          />
          <UrlBtn onClick={saveUrl}>저장</UrlBtn>
        </UrlRow>
        <Hint>한 번 저장하면 다음 방문 시 자동 입력됨</Hint>
      </UrlBox>

      {error && <ErrorBox>{error}</ErrorBox>}

      <SectionTitle>의뢰자 (5)</SectionTitle>
      <Grid>
        {ACCOUNTS.filter((a) => a.role === "의뢰자").map((a) => (
          <Card key={a.uid} onClick={() => loginAs(a.uid)} disabled={busyUid === a.uid}>
            <Tag>{a.id}</Tag>
            <Name>{a.nickname}</Name>
            <Meta>{a.region}</Meta>
            {busyUid === a.uid && <Loading>로그인 중...</Loading>}
          </Card>
        ))}
      </Grid>

      <SectionTitle>홈프로 — 메인 (4)</SectionTitle>
      <Grid>
        {ACCOUNTS.filter((a) => a.role.startsWith("홈프로") && !a.role.includes("지원자풀")).map((a) => (
          <Card key={a.uid} onClick={() => loginAs(a.uid)} disabled={busyUid === a.uid}>
            <Tag $type="pro">{a.id}</Tag>
            <Name>{a.nickname}</Name>
            <Meta>{a.region}</Meta>
            <SubMeta>{a.role.replace("홈프로", "").replace(/[\(\)]/g, "")}</SubMeta>
            {busyUid === a.uid && <Loading>로그인 중...</Loading>}
          </Card>
        ))}
      </Grid>

      <SectionTitle>홈프로 — 지원자 풀 (5)</SectionTitle>
      <Grid>
        {ACCOUNTS.filter((a) => a.role.includes("지원자풀")).map((a) => (
          <Card key={a.uid} onClick={() => loginAs(a.uid)} disabled={busyUid === a.uid}>
            <Tag $type="pool">{a.id}</Tag>
            <Name>{a.nickname}</Name>
            <Meta>{a.region}</Meta>
            {busyUid === a.uid && <Loading>로그인 중...</Loading>}
          </Card>
        ))}
      </Grid>
    </Wrap>
  );
};

export default SeedLoginPage;

const Wrap = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 16px 80px;
  font-family: -apple-system, "Apple SD Gothic Neo", sans-serif;
`;
const Header = styled.div`
  margin-bottom: 20px;
`;
const Title = styled.h1`
  font-size: 22px;
  margin: 0 0 4px;
  color: #1b54b8;
`;
const Sub = styled.div`
  font-size: 13px;
  color: #888;
`;
const UrlBox = styled.div`
  background: #FAFAFA;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
`;
const UrlLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #555;
  margin-bottom: 6px;
`;
const UrlRow = styled.div`
  display: flex;
  gap: 6px;
`;
const UrlInput = styled.input`
  flex: 1;
  padding: 8px 10px;
  font-size: 12px;
  border: 1px solid #DDD;
  border-radius: 6px;
  font-family: monospace;
`;
const UrlBtn = styled.button`
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  background: #2571e3;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;
const Hint = styled.div`
  font-size: 11px;
  color: #999;
  margin-top: 4px;
`;
const ErrorBox = styled.div`
  background: #FEE2E2;
  color: #991B1B;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 12px;
`;
const SectionTitle = styled.h3`
  font-size: 14px;
  color: #444;
  margin: 18px 0 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid #e7f0fd;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
`;
const Card = styled.button`
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) {
    border-color: #2571e3;
    box-shadow: 0 2px 8px rgba(37, 113, 227, 0.15);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const Tag = styled.div`
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: ${({ $type }) => ($type === "pro" ? "#2571e3" : $type === "pool" ? "#9CA3AF" : "#3B82F6")};
  padding: 2px 8px;
  border-radius: 10px;
  margin-bottom: 6px;
`;
const Name = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #222;
  margin-bottom: 2px;
`;
const Meta = styled.div`
  font-size: 11px;
  color: #666;
`;
const SubMeta = styled.div`
  font-size: 10px;
  color: #888;
  margin-top: 2px;
`;
const Loading = styled.div`
  font-size: 10px;
  color: #2571e3;
  margin-top: 4px;
`;
