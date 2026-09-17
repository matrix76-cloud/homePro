/* eslint-disable */
/**
 * 프로필 보기 — 팝업이 아니라 별도 페이지 (대표 9/17)
 *   접수자·홈프로 이름을 누르면 이 화면으로 들어온다. 뒤로가기로 돌아간다.
 */
import React from "react";
import { useParams, useLocation } from "react-router-dom";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import ProfilePopup from "../../components/ProfilePopup";

const ProfileViewPage = () => {
  const { uid } = useParams();
  const { state } = useLocation();
  return (
    <SimpleBackLayout NAME="프로필">
      <ProfilePopup
        asPage
        uid={uid}
        fallbackName={state?.fallbackName}
        fallbackPhoto={state?.fallbackPhoto}
      />
    </SimpleBackLayout>
  );
};

export default ProfileViewPage;
