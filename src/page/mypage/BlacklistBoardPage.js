/* eslint-disable */
/* 블랙리스트 공개 게시판 (형 지시 7/31)
 * — 신고 즉시 등록, 업체명·전화번호 일부 마스킹 + 신고 사유 공개, 모든 사용자 조회 가능.
 *   피해 예방 + 잠재적 블랙리스트 대상에게 경각심 부여.
 * — 관리자 확인 후 중대 사안은 오더 작성·수락 권한 차단 (상태 표기). */
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { IoShieldOutline, IoImageOutline, IoCloseOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { getBlacklistBoard, BLACKLIST_STATUS_LABEL } from "../../service/BlacklistService";

const formatDate = (ts) => {
  const d = ts?.toDate?.();
  if (!d) return "-";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const BlacklistBoardPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgView, setImgView] = useState(null); // 증빙 이미지 열람

  useEffect(() => {
    getBlacklistBoard()
      .then(setReports)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SimpleBackLayout NAME="블랙리스트" onBack={() => navigate(-1)}>
      <PageWrap>
        <NoticeBox>
          블랙리스트 신고 건은 개인정보 보호를 위해 업체명·전화번호가 일부 마스킹되어 공개됩니다.
          관리자가 증빙을 확인하여 중대 사안으로 판단되면 해당 사용자의 오더 작성 및 수락 권한이 차단됩니다.
        </NoticeBox>

        {loading ? (
          <EmptyText>불러오는 중...</EmptyText>
        ) : reports.length === 0 ? (
          <EmptyWrap>
            <IoShieldOutline size={40} color={THEME.muted} />
            <EmptyText>등록된 블랙리스트가 없습니다</EmptyText>
          </EmptyWrap>
        ) : (
          reports.map((r) => (
            <ReportCard key={r.id}>
              <ReportTop>
                <ReportName>{r.targetNameMasked || "미확인"}</ReportName>
                <ReportStatus $confirmed={r.status === "confirmed"}>
                  {BLACKLIST_STATUS_LABEL[r.status] || BLACKLIST_STATUS_LABEL.pending}
                </ReportStatus>
              </ReportTop>
              <ReportMeta>
                {r.targetPhoneMasked || "미등록"} · {formatDate(r.createdAt)}
              </ReportMeta>
              <ReportReason>신고 사유 — {r.reasonType || r.reason || "기타"}</ReportReason>
              {r.content && <ReportContent>{r.content}</ReportContent>}
              {Array.isArray(r.imgs) && r.imgs.length > 0 && (
                <EvidenceRow>
                  {r.imgs.map((src, i) => (
                    <EvidenceThumb key={i} onClick={() => setImgView(src)}>
                      <img src={src} alt={`증빙 ${i + 1}`} />
                    </EvidenceThumb>
                  ))}
                  <EvidenceCount><IoImageOutline size={14} /> 증빙 {r.imgs.length}장</EvidenceCount>
                </EvidenceRow>
              )}
              {r.status !== "confirmed" && (
                <ReportFootNote>관리자 확인 후 중대 사안으로 판단되면 오더 작성·수락 권한이 차단됩니다</ReportFootNote>
              )}
            </ReportCard>
          ))
        )}

        {imgView && (
          <ImgOverlay onClick={() => setImgView(null)}>
            <ImgCloseBtn><IoCloseOutline size={28} color="#fff" /></ImgCloseBtn>
            <ImgFull src={imgView} alt="증빙" onClick={(e) => e.stopPropagation()} />
          </ImgOverlay>
        )}
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default BlacklistBoardPage;

const PageWrap = styled.div`
  padding: 16px 12px;
  min-height: 60vh;
`;
const NoticeBox = styled.div`
  font-size: 13px; color: ${THEME.muted}; line-height: 1.55;
  background: #fff; border: 1px solid ${THEME.border};
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
`;
const EmptyWrap = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 48px 0;
`;
const EmptyText = styled.div`
  text-align: center; color: ${THEME.muted}; padding: 16px 0; font-size: 15px;
`;
const ReportCard = styled.div`
  background: #fff; border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 8px;
`;
const ReportTop = styled.div`
  display: flex; align-items: center; justify-content: space-between;
`;
const ReportName = styled.div`
  font-size: 17px; font-weight: 700; color: ${THEME.text};
`;
const ReportStatus = styled.div`
  font-size: 13px; font-weight: 600;
  color: ${({ $confirmed }) => ($confirmed ? "#EF4444" : "#8A8F98")};
`;
const ReportMeta = styled.div`
  font-size: 14px; color: ${THEME.muted}; margin-top: 3px;
`;
const ReportReason = styled.div`
  font-size: 15px; font-weight: 600; color: ${THEME.text}; margin-top: 10px;
`;
const ReportContent = styled.div`
  font-size: 15px; color: ${THEME.text}; line-height: 1.55; margin-top: 6px;
  white-space: pre-wrap;
`;
const EvidenceRow = styled.div`
  display: flex; align-items: center; gap: 8px; margin-top: 10px;
`;
const EvidenceThumb = styled.div`
  width: 52px; height: 52px; border-radius: 10px; overflow: hidden; cursor: pointer;
  border: 1px solid ${THEME.border};
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const EvidenceCount = styled.div`
  display: flex; align-items: center; gap: 4px;
  font-size: 13px; color: ${THEME.muted};
`;
const ReportFootNote = styled.div`
  font-size: 13px; color: ${THEME.muted}; margin-top: 10px;
`;
const ImgOverlay = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
`;
const ImgCloseBtn = styled.button`
  position: absolute; top: 16px; right: 16px;
  background: none; border: none; cursor: pointer;
`;
const ImgFull = styled.img`
  max-width: 94%; max-height: 86%; object-fit: contain; border-radius: 8px;
`;
