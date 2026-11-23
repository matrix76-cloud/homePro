/* eslint-disable */
/* 운영자 강제 숨김 안내 (대표 리뷰 11/22)
 *  숨긴 글은 남에게 안 보이고, 작성자 본인 화면에만 이 안내가 붙는다.
 *   - AdminHiddenNotice : 상세 화면 맨 위에 두는 한 칸 (사유가 있으면 같이)
 *   - AdminHiddenText   : 목록 줄 안에 넣는 한 줄 글
 *   - AdminHiddenBlocked: 남이 숨긴 글 주소로 들어왔을 때 본문 대신 보여 주는 글 */
import React from "react";
import styled from "styled-components";
import { THEME } from "../config/homeproConfig";
import { ADMIN_HIDDEN_NOTICE } from "../service/ModerationService";

export const AdminHiddenNotice = ({ item, style }) => (
  <NoticeBox style={style}>
    <b>{ADMIN_HIDDEN_NOTICE}</b>
    <span>
      {item?.adminHiddenReason ? `사유: ${item.adminHiddenReason} · ` : ""}다른 회원에게는 이 글이 보이지 않습니다. 문의는 고객센터로 해 주세요.
    </span>
  </NoticeBox>
);

export const AdminHiddenText = ({ style }) => <HiddenText style={style}>{ADMIN_HIDDEN_NOTICE}</HiddenText>;

export const AdminHiddenBlocked = () => <Blocked>운영자에 의해 숨김 처리된 글입니다.</Blocked>;

const NoticeBox = styled.div`
  display: flex; flex-direction: column; gap: 4px;
  margin: 0 0 14px; padding: 12px 14px;
  background: #fff; border: 1px solid ${THEME.danger}; border-radius: 10px;
  b { font-size: 15px; font-weight: 600; color: ${THEME.danger}; }
  span { font-size: 14px; line-height: 1.5; color: ${THEME.text}; word-break: keep-all; }
`;
const HiddenText = styled.span`
  font-size: 14px; font-weight: 600; color: ${THEME.danger}; word-break: keep-all;
`;
const Blocked = styled.div`
  padding: 80px 20px; text-align: center; font-size: 16px; line-height: 1.6; color: ${THEME.text}; word-break: keep-all;
`;

export default AdminHiddenNotice;
