/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoTrashOutline } from "react-icons/io5";
import { getMyBlacklist, removeFromBlacklist, BLACKLIST_STATUS_LABEL } from "../../service/BlacklistService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../api/config";
import usePcWide from "../../hooks/usePcWide";
import { pcOnly, PC, PcTable, PcTHead, PcTRow, PcEmpty } from "../../pc/pcKit";

const BlacklistPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.uid || userData?.uid;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const pcWide = usePcWide();

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const raw = await getMyBlacklist(uid);
        // targetUid로 사용자 이름 조회
        const enriched = await Promise.all(raw.map(async (item) => {
          try {
            const userDoc = await getDoc(doc(db, "users", item.targetUid));
            const name = userDoc.exists() ? (userDoc.data().companyName || userDoc.data().nickname || userDoc.data().name || item.targetUid) : item.targetUid;
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
    <SimpleBackLayout NAME="나의 블랙리스트 신고" onBack={() => navigate(-1)}>
      <PageWrap>
        {pcWide ? (
          <PcTable>
            <PcTHead $cols={BL_COLS}><span>신고 대상</span><span>사유 · 내용</span><span>처리 상태</span><span>신고일</span><span>관리</span></PcTHead>
            {loading && <PcEmpty><b>불러오는 중...</b></PcEmpty>}
            {!loading && list.length === 0 && <PcEmpty><b>블랙리스트에 신고한 사용자가 없습니다.</b><span>상대 프로필의 블랙리스트 신고에서 접수할 수 있습니다.</span></PcEmpty>}
            {list.map((item) => (
              <PcTRow key={item.id} $cols={BL_COLS} $click={false}>
                <b>{item.targetName}</b>
                <span style={{ lineHeight: 1.55 }}>{(item.reasonType || item.reason) ? `${item.reasonType || item.reason}${item.content ? ` — ${item.content}` : ""}` : "-"}</span>
                <span style={{ fontWeight: 700, color: item.status === "confirmed" ? "#EF4444" : PC.ink }}>{item.status ? (BLACKLIST_STATUS_LABEL[item.status] || "-") : "-"}</span>
                <span>{item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleDateString() : "-"}</span>
                <span><RemoveBtn onClick={() => handleRemove(item.targetUid)}><IoTrashOutline size={18} />해제</RemoveBtn></span>
              </PcTRow>
            ))}
          </PcTable>
        ) : loading ? (
          <EmptyText>불러오는 중...</EmptyText>
        ) : list.length === 0 ? (
          <EmptyText>블랙리스트에 신고한 사용자가 없습니다.</EmptyText>
        ) : (
          list.map(item => (
            <Card key={item.id}>
              <CardInfo>
                <CardName>{item.targetName}</CardName>
                {(item.reasonType || item.reason) && <CardReason>{item.reasonType || item.reason}{item.content ? ` — ${item.content}` : ""}</CardReason>}
                {item.status && <CardStatus $confirmed={item.status === "confirmed"}>{BLACKLIST_STATUS_LABEL[item.status] || ""}</CardStatus>}
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

const BL_COLS = "minmax(180px, 1fr) minmax(280px, 2.4fr) 150px 140px 120px";
const PageWrap = styled.div`
  padding: 16px 12px;
  min-height: 60vh;
  ${pcOnly`max-width: 1180px; margin: 0 auto; box-sizing: border-box; padding: 28px 32px 60px; word-break: keep-all;`}
`;
const EmptyText = styled.div`
  text-align: center; color: #555; padding: 40px 0; font-size: 16px;
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
  font-size: 17px; font-weight: 600; color: #222;
`;
const CardReason = styled.div`
  font-size: 15px; color: #444; margin-top: 4px;
`;
const CardDate = styled.div`
  font-size: 14px; color: #555; margin-top: 2px;
`;
const CardStatus = styled.div`
  font-size: 14px; font-weight: 600; margin-top: 3px;
  color: ${({ $confirmed }) => ($confirmed ? "#EF4444" : "#8A8F98")};
`;
const RemoveBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  background: none; border: 1px solid #EF4444; color: #EF4444;
  border-radius: 10px; padding: 8px 12px; font-size: 15px; font-weight: 600;
  cursor: pointer;
`;
