/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoTrashOutline } from "react-icons/io5";

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
        setBlocks(list);
      } catch { }
      setLoading(false);
    })();
  }, [uid]);

  const handleUnblock = async (blockedUid) => {
    if (!window.confirm("거부를 해제하시겠습니까?")) return;
    try {
      const { unblockUser } = await import("../../service/BlockService");
      await unblockUser(uid, blockedUid);
      setBlocks(prev => prev.filter(b => b.blockedUid !== blockedUid));
    } catch { }
  };

  return (
    <SimpleBackLayout title="거부 목록" onBack={() => navigate(-1)}>
      <PageWrap>
        {loading ? (
          <EmptyText>불러오는 중...</EmptyText>
        ) : blocks.length === 0 ? (
          <EmptyText>거부 등록된 사용자가 없습니다.</EmptyText>
        ) : (
          blocks.map(block => (
            <BlockCard key={block.id}>
              <BlockInfo>
                <BlockName>{block.blockedUid}</BlockName>
                {block.reason && <BlockReason>{block.reason}</BlockReason>}
                <BlockDate>
                  {block.createdAt?.toDate?.()
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
const EmptyText = styled.div`
  text-align: center; color: #999; padding: 40px 0; font-size: 14px;
`;
const BlockCard = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 16px; padding: 16px 20px;
  margin-bottom: 8px;
`;
const BlockInfo = styled.div`
  flex: 1;
`;
const BlockName = styled.div`
  font-size: 15px; font-weight: 600; color: #222;
`;
const BlockReason = styled.div`
  font-size: 13px; color: #666; margin-top: 4px;
`;
const BlockDate = styled.div`
  font-size: 12px; color: #999; margin-top: 2px;
`;
const UnblockBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  background: none; border: 1px solid #EF4444; color: #EF4444;
  border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 600;
  cursor: pointer;
`;
