/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { IoLocationOutline, IoCalendarOutline, IoPeopleOutline } from "react-icons/io5";


const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const formatPrice = (price) => {
    if (!price && price !== 0) return "가격 미정";
    if (price === 0) return "무료";
    return `${Number(price).toLocaleString()}원`;
};

const TrainingPage = () => {
    const navigate = useNavigate();
    const { userData } = useAuth();
    const { user } = useContext(UserContext);
    const regionName = user?.USERINFO?.address_name || "지역 미설정";
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, "homepro_trainings"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setTrainings(list);
            setLoading(false);
        }, (err) => {
            console.error("교육 목록 로드 실패:", err);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filtered = trainings;

    return (
        <MainListLayout NAME="기술전수교육" footerType="training" hideBack location={regionName}>
            {/* 리스트 */}
            <ListWrap>
                {loading ? (
                    <EmptyWrap>
                        <EmptyText>불러오는 중...</EmptyText>
                    </EmptyWrap>
                ) : filtered.length === 0 ? (
                    <EmptyWrap>
                        <EmptyText>등록된 교육이 없습니다</EmptyText>
                        <EmptySubText>새로운 교육을 등록해보세요</EmptySubText>
                    </EmptyWrap>
                ) : (
                    filtered.map((item) => (
                        <Card key={item.id} onClick={() => navigate(`/training/${item.id}`)}>
                            <CardTop>
                                <StatusBadge $status={item.status}>
                                    {item.status || "모집중"}
                                </StatusBadge>
                            </CardTop>
                            <CardTitle>{item.title}</CardTitle>
                            <Instructor>{item.instructor}</Instructor>
                            {item.description && (
                                <Description>{item.description}</Description>
                            )}
                            <InfoRow>
                                <InfoItem>
                                    <IoCalendarOutline size={14} color={THEME.muted} />
                                    <InfoText>{item.period || "일정 미정"}</InfoText>
                                </InfoItem>
                                <InfoItem>
                                    <IoPeopleOutline size={14} color={THEME.muted} />
                                    <InfoText>{item.capacity ? `${item.capacity}명` : "인원 미정"}</InfoText>
                                </InfoItem>
                                <InfoItem>
                                    <IoLocationOutline size={14} color={THEME.muted} />
                                    <InfoText>{item.location || "지역 미정"}</InfoText>
                                </InfoItem>
                            </InfoRow>
                            <CardBottom>
                                <Price>{formatPrice(item.price)}</Price>
                                <DateText>{formatDate(item.createdAt)}</DateText>
                            </CardBottom>
                        </Card>
                    ))
                )}
            </ListWrap>

            {/* FAB */}
            <FloatBtn onClick={() => navigate("/training/create")}>+ 교육 등록</FloatBtn>
        </MainListLayout>
    );
};

export default TrainingPage;

/* ===================== styles ===================== */

const ListWrap = styled.div`
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Card = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    padding: 20px;
    box-shadow: ${THEME.cardShadow};
    cursor: pointer;
    transition: transform 0.15s;
    &:active { transform: scale(0.98); }
`;

const CardTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

const CategoryBadge = styled.span`
    font-size: 12px;
    font-weight: 400;
    color: #fff;
    background: ${THEME.primary};
    padding: 3px 9px;
    border-radius: 20px;
`;

const StatusBadge = styled.span`
    font-size: 12px;
    font-weight: 700;
    color: ${(p) => (p.$status === "마감" ? THEME.muted : THEME.primary)};
`;

const CardTitle = styled.h3`
    font-size: 16px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 4px;
    line-height: 1.4;
`;

const Instructor = styled.div`
    font-size: 13px;
    color: ${THEME.textSecondary};
    margin-bottom: 8px;
`;

const Description = styled.div`
    font-size: 13px;
    color: ${THEME.muted};
    line-height: 1.5;
    margin-bottom: 10px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const InfoRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
`;

const InfoItem = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const InfoText = styled.span`
    font-size: 12px;
    color: ${THEME.muted};
`;

const CardBottom = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid ${THEME.border};
`;

const Price = styled.span`
    font-size: 16px;
    font-weight: 700;
    color: ${THEME.primary};
`;

const DateText = styled.span`
    font-size: 12px;
    color: ${THEME.muted};
`;

const EmptyWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    margin-bottom: 16px;
`;

const EmptyText = styled.div`
    font-size: 15px;
    font-weight: 600;
    color: ${THEME.textSecondary};
`;

const EmptySubText = styled.div`
    font-size: 13px;
    color: ${THEME.muted};
    margin-top: 6px;
`;

const FloatBtn = styled.button`
    position: fixed;
    bottom: calc(70px + env(safe-area-inset-bottom, 0px));
    right: calc(50% - 163px);
    padding: 10px 18px;
    background: ${THEME.primary};
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    cursor: pointer;
    z-index: 90;
    &:active { opacity: 0.85; }
`;
