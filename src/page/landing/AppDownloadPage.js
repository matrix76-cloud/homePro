/* eslint-disable */
/**
 * 앱 다운로드 이동 페이지 /app — 랜딩의 QR 이 여기로 온다 (형 9/20).
 *  · 안드로이드 폰 → 플레이스토어, 아이폰 → 앱스토어로 바로 보낸다.
 *  · PC 이거나 아직 출시 전(주소 없음)이면 보내지 않고 이 화면을 보여 준다: 두 스토어 버튼 + QR + 웹으로 계속하기.
 *  · 주소는 AppLinkService(settings/appLinks) — 출시되면 주소만 넣으면 된다.
 */
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { getAppLinks, detectPlatform } from "../../service/AppLinkService";

const AppDownloadPage = () => {
  const navigate = useNavigate();
  const [links, setLinks] = useState(null);
  const platform = detectPlatform();

  useEffect(() => {
    let alive = true;
    getAppLinks().then((l) => {
      if (!alive) return;
      setLinks(l);
      const target = platform === "android" ? l.androidUrl : platform === "ios" ? l.iosUrl : "";
      if (target) window.location.replace(target);
    });
    return () => { alive = false; };
  }, []);

  if (!links) return <Wrap><Card><Brand>홈프로</Brand><Msg>스토어 주소를 확인하고 있습니다.</Msg></Card></Wrap>;

  const myUrl = platform === "android" ? links.androidUrl : platform === "ios" ? links.iosUrl : "";
  if (myUrl) return <Wrap><Card><Brand>홈프로</Brand><Msg>스토어로 이동합니다.</Msg><StoreBtn as="a" href={myUrl}>이동하지 않으면 여기를 누르세요</StoreBtn></Card></Wrap>;

  const onPhone = platform !== "other";
  return (
    <Wrap>
      <Card>
        <Brand onClick={() => navigate("/intro")}>홈프로</Brand>
        <Title>홈프로 앱 받기</Title>
        {onPhone ? (
          <Msg>
            {platform === "android" ? "안드로이드" : "아이폰"} 앱은 출시 준비 중입니다.<br />
            출시 전까지는 웹에서 같은 기능을 그대로 쓰실 수 있습니다.
          </Msg>
        ) : (
          <Msg>휴대폰 카메라로 QR 을 찍으면 기종에 맞는 스토어로 이동합니다.</Msg>
        )}

        {!onPhone && <Qr src="/assets/landing/app-qr.svg" alt="홈프로 앱 다운로드 QR" />}

        <Stores>
          <StoreLink label="Google Play" sub="안드로이드" icon={<FaGooglePlay />} url={links.androidUrl} />
          <StoreLink label="App Store" sub="아이폰" icon={<FaApple />} url={links.iosUrl} />
        </Stores>

        <WebBtn onClick={() => navigate("/MobileLogin")}>웹으로 계속하기</WebBtn>
      </Card>
    </Wrap>
  );
};

// 스토어 버튼 — 주소가 없으면 누를 수 없고 "출시 준비 중"으로 표시
export const StoreLink = ({ label, sub, icon, url }) => (
  <StoreBtn as={url ? "a" : "div"} href={url || undefined} target={url ? "_blank" : undefined} rel="noreferrer" $off={!url}>
    <span className="ic">{icon}</span>
    <span>
      <b>{label}</b>
      <em>{url ? sub : `${sub} · 출시 준비 중`}</em>
    </span>
  </StoreBtn>
);

export default AppDownloadPage;

const Wrap = styled.div`
  min-height: 100vh; background: #F7F8FA; display: flex; align-items: center; justify-content: center;
  padding: 32px 20px; box-sizing: border-box; word-break: keep-all;
`;
const Card = styled.div`
  width: 100%; max-width: 460px; background: #fff; border: 1px solid #dfe3e8; border-radius: 16px;
  padding: 40px 32px; box-sizing: border-box; text-align: center;
`;
const Brand = styled.div` font-size: 28px; font-weight: 800; color: #00963F; cursor: pointer; `;
const Title = styled.h1` font-size: 24px; font-weight: 800; color: #14181F; margin: 18px 0 10px; `;
const Msg = styled.p` font-size: 16px; line-height: 1.7; color: #2b2f36; margin: 12px 0 0; `;
const Qr = styled.img` display: block; width: 190px; height: 190px; margin: 26px auto 0; border: 1px solid #dfe3e8; border-radius: 12px; padding: 10px; box-sizing: border-box; `;
const Stores = styled.div` display: grid; gap: 10px; margin-top: 26px; `;
export const StoreBtn = styled.div`
  display: flex; align-items: center; gap: 14px; text-align: left; text-decoration: none; box-sizing: border-box;
  border: 1px solid #dfe3e8; border-radius: 12px; padding: 14px 20px; background: #fff; color: #14181F;
  cursor: ${({ $off }) => ($off ? "default" : "pointer")};
  .ic { font-size: 26px; display: flex; color: ${({ $off }) => ($off ? "#2b2f36" : "#14181F")}; }
  b { display: block; font-size: 17px; font-weight: 800; }
  em { display: block; font-style: normal; font-size: 14px; color: #2b2f36; margin-top: 2px; }
  &:hover { border-color: ${({ $off }) => ($off ? "#dfe3e8" : "#14181F")}; }
`;
const WebBtn = styled.button`
  width: 100%; margin-top: 14px; border: none; border-radius: 12px; padding: 16px 0; cursor: pointer;
  background: #00963F; color: #fff; font-size: 17px; font-weight: 700; font-family: inherit;
  &:hover { background: #007A33; }
`;
