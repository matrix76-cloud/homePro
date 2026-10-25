import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

/** 없는 주소로 들어왔을 때 — 빈 화면 대신 안내 + 홈으로 */
const Wrap = styled.div`
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px 20px 15vh;
  color: #1b1f27;
`;
const Mark = styled.svg`
  width: 64px;
  height: 64px;
`;
const Title = styled.div`
  font-size: 21px;
  font-weight: 700;
  margin-top: 16px;
`;
const Desc = styled.div`
  font-size: 15px;
  line-height: 1.55;
  margin-top: 8px;
  color: #2b2f36;
  word-break: keep-all;
`;
const Path = styled.div`
  font-size: 13px;
  margin-top: 10px;
  color: #2b2f36;
  word-break: break-all;
`;
const Row = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 24px;
`;
const Primary = styled.button`
  height: 50px;
  padding: 0 22px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: #00963F;
  border: 1px solid #00963F;
  border-radius: 4px;
  cursor: pointer;
`;
const Ghost = styled.button`
  height: 50px;
  padding: 0 22px;
  font-size: 15px;
  font-weight: 500;
  color: #1b1f27;
  background: #fff;
  border: 1px solid #d5d9e0;
  border-radius: 4px;
  cursor: pointer;
`;

const NotFoundPage = () => {
  const navigate = useNavigate();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  return (
    <Wrap>
      <Mark viewBox="0 0 64 64" fill="none" stroke="#1b1f27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="14" width="44" height="36" rx="2" />
        <path d="M10 24h44" />
        <circle cx="17" cy="19" r="1.3" fill="#1b1f27" stroke="none" />
        <circle cx="22" cy="19" r="1.3" fill="#1b1f27" stroke="none" />
        <path d="M26 34l12 8M38 34l-12 8" />
      </Mark>
      <Title>화면을 찾을 수 없어요</Title>
      <Desc>주소가 바뀌었거나 없는 화면이에요.<br />홈에서 다시 찾아 주세요.</Desc>
      {path ? <Path>{path}</Path> : null}
      <Row>
        <Primary type="button" onClick={() => navigate("/MobileMain", { replace: true })}>홈으로</Primary>
        <Ghost type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/MobileMain", { replace: true }))}>이전 화면</Ghost>
      </Row>
    </Wrap>
  );
};

export default NotFoundPage;
