/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoTrashOutline } from "react-icons/io5";
import { getMyBlacklist, removeFromBlacklist } from "../../service/BlacklistService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../api/config";

const BlacklistPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.uid || userData?.uid;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const raw = await getMyBlacklist(uid);
        // targetUid로 사용자 이름 조회
        const enriched = await Promise.all(raw.map(async (item) => {
          try {
            const userDoc = await getDoc(doc(db, "users", item.targetUid));
            const name = userDoc.exists() ? (userDoc.data().nickname || userDoc.data().name || item.targetUid) : item.targetUid;
            return { ...item, targetName: name };
          } catch {
            return { ...item, targetName: item.targetUid };
          }
        }));
        setList(enriched);
      } catch { }
      setLoading(false);
    })();
  }, [uid]);

  const handleRemove = async (targetUid) => {
    if (!window.confirm("블랙리스트를 해제하시겠습니까?")) return;
    try {
      await removeFromBlacklist(uid, targetUid);
      setList(prev => prev.filter(b => b.targetUid !== targetUid));
    } catch { }
  };

  return (
    <SimpleBackLayout title="블랙리스트" onBack={() => navigate(-1)}>
      <PageWrap>
        {loading ? (
          <EmptyText>불러오는 중...</EmptyText>
        ) : list.length === 0 ? (
          <EmptyText>블랙리스트에 등록된 사용자가 없습니다.</EmptyText>
        ) : (
          list.map(item => (
            <Card key={item.id}>
              <CardInfo>
                <CardName>{item.targetName}</CardName>
                {item.reason && <CardReason>{item.reason}</CardReason>}
                <CardDate>
                  {item.createdAt?.toDate?.()
                    ? item.createdAt.toDate().toLocaleDateString()
                    : "-"}
                </CardDate>
              </CardInfo>
              <RemoveBtn onClick={() => handleRemove(item.targetUid)}>
                <IoTrashOutline size={18} />
                해제
              </RemoveBtn>
            </Card>
          ))
        )}
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default BlacklistPage;

const PageWrap = styled.div`
  padding: 16px 12px;
  min-height: 60vh;
`;
const EmptyText = styled.div`
  text-align: center; color: #999; padding: 40px 0; font-size: 14px;
`;
const Card = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 16px; padding: 16px 20px;
  margin-bottom: 8px;
`;
const CardInfo = styled.div`
  flex: 1;
`;
const CardName = styled.div`
  font-size: 15px; font-weight: 600; color: #222;
`;
const CardReason = styled.div`
  font-size: 13px; color: #666; margin-top: 4px;
`;
const CardDate = styled.div`
  font-size: 12px; color: #999; margin-top: 2px;
`;
const RemoveBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  background: none; border: 1px solid #EF4444; color: #EF4444;
  border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 600;
  cursor: pointer;
`;
