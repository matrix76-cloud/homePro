/* eslint-disable */
/* 나의 거부 목록 — 내가 직접 거부 등록한 사용자 관리 (형 지시 7/31)
 * 프로필 사진 · 이름/업체명 · 거부 등록일 · 거부 사유 표시, 언제든 해제 가능 */
import React, { useState, useEffect, useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../api/config";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoTrashOutline, IoPersonCircleOutline } from "react-icons/io5";

const BlockListPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.uid || userData?.uid;
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const { getMyBlocks } = await import("../../service/BlockService");
        const list = await getMyBlocks(uid);
        // 거부 대상 프로필(사진·이름/업체명) 붙이기
        const enriched = await Promise.all(list.map(async (b) => {
          try {
            const snap = await getDoc(doc(db, "users", b.blockedUid));
            if (snap.exists()) {
              const u = snap.data();
              return {
                ...b,
                targetName: u.companyName || u.nickname || u.name || "알 수 없음",
                targetPhoto: u.profileImage || u.photoURL || "",
              };
            }
          } catch (e) { }
          return { ...b, targetName: "알 수 없음", targetPhoto: "" };
        }));
        setBlocks(enriched);
      } catch { }
      setLoading(false);
    })();
  }, [uid]);

  const handleUnblock = async (blockedUid) => {
    if (!window.confirm("거부를 해제하시겠습니까?\n해제하면 이 사용자와 다시 오더 공유 및 수락이 가능해집니다.")) return;
    try {
      const { unblockUser } = await import("../../service/BlockService");
      await unblockUser(uid, blockedUid);
      setBlocks(prev => prev.filter(b => b.blockedUid !== blockedUid));
    } catch { }
  };

  return (
    <SimpleBackLayout NAME="거부 목록" onBack={() => navigate(-1)}>
      <PageWrap>
        <NoticeBox>
          거부 등록한 사용자와는 오더 공유 및 수락이 거부됩니다. 오해로 등록한 경우 언제든 해제할 수 있습니다.
        </NoticeBox>
        {loading ? (
          <EmptyText>불러오는 중...</EmptyText>
        ) : blocks.length === 0 ? (
          <EmptyText>거부 등록된 사용자가 없습니다.</EmptyText>
        ) : (
          blocks.map(block => (
            <BlockCard key={block.id}>
              <BlockAvatar>
                {block.targetPhoto ? (
                  <img src={block.targetPhoto} alt="" />
                ) : (
                  <IoPersonCircleOutline size={44} color={THEME.muted} />
                )}
              </BlockAvatar>
              <BlockInfo>
                <BlockName>{block.targetName}</BlockName>
                {block.reason && <BlockReason>{block.reason}</BlockReason>}
                <BlockDate>
                  거부 등록일 {block.createdAt?.toDate?.()
                    ? block.createdAt.toDate().toLocaleDateString()
                    : "-"}
                </BlockDate>
              </BlockInfo>
              <UnblockBtn onClick={() => handleUnblock(block.blockedUid)}>
                <IoTrashOutline size={18} />
                해제
              </UnblockBtn>
            </BlockCard>
          ))
        )}
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default BlockListPage;

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
const EmptyText = styled.div`
  text-align: center; color: #555; padding: 40px 0; font-size: 16px;
`;
const BlockCard = styled.div`
  display: flex; align-items: center; gap: 12px;
  background: #fff; border-radius: 16px; padding: 16px 20px;
  margin-bottom: 8px;
`;
const BlockAvatar = styled.div`
  width: 44px; height: 44px; border-radius: 22px; overflow: hidden;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const BlockInfo = styled.div`
  flex: 1;
`;
const BlockName = styled.div`
  font-size: 17px; font-weight: 600; color: #222;
`;
const BlockReason = styled.div`
  font-size: 15px; color: #444; margin-top: 4px;
`;
const BlockDate = styled.div`
  font-size: 14px; color: #555; margin-top: 2px;
`;
const UnblockBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  background: none; border: 1px solid #EF4444; color: #EF4444;
  border-radius: 10px; padding: 8px 12px; font-size: 15px; font-weight: 600;
  cursor: pointer;
`;
