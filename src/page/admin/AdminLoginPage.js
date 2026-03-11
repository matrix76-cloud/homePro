/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";

const Wrap = styled.div`
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; background: ${THEME.background};
`;
const Card = styled.div`
    width: 380px; background: #fff; border-radius: 4px;
    padding: 40px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
`;
const Title = styled.h2`
    text-align: center; margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${THEME.text};
`;
const Sub = styled.p`
    text-align: center; margin: 0 0 28px; font-size: 13px; color: ${THEME.muted};
`;
const Label = styled.label`
    display: block; font-size: 13px; font-weight: 600; color: ${THEME.text}; margin-bottom: 6px;
`;
const Input = styled.input`
    width: 100%; padding: 10px 12px; border: 1px solid ${THEME.border}; border-radius: 4px;
    font-size: 14px; margin-bottom: 16px; outline: none;
    &:focus { border-color: ${THEME.primary}; }
`;
const Btn = styled.button`
    width: 100%; padding: 12px; background: ${THEME.primary}; color: #fff;
    border: none; border-radius: 4px; font-size: 15px; font-weight: 600; cursor: pointer;
    &:disabled { opacity: 0.5; }
`;
const Err = styled.p`
    color: ${THEME.danger}; font-size: 13px; text-align: center; margin: 12px 0 0;
`;

const AdminLoginPage = () => {
    const nav = useNavigate();
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!loginId || !password) { setError("아이디와 비밀번호를 입력하세요"); return; }
        setLoading(true); setError("");
        try {
            const snap = await getDocs(query(collection(db, "admin"), where("loginId", "==", loginId)));
            if (snap.empty) { setError("존재하지 않는 관리자 계정입니다"); setLoading(false); return; }
            const doc = snap.docs[0];
            const data = doc.data();
            if (data.password !== password) { setError("비밀번호가 일치하지 않습니다"); setLoading(false); return; }
            localStorage.setItem("adminSession", JSON.stringify({
                id: doc.id, loginId: data.loginId, name: data.name || "관리자",
                rank: data.rank || "admin", loggedInAt: new Date().toISOString(),
            }));
            nav("/admin");
        } catch (err) {
            setError("로그인 중 오류가 발생했습니다");
        }
        setLoading(false);
    };

    return (
        <Wrap>
            <Card>
                <Title>홈프로 관리자</Title>
                <Sub>관리자 계정으로 로그인하세요</Sub>
                <form onSubmit={handleLogin}>
                    <Label>아이디</Label>
                    <Input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="관리자 아이디" />
                    <Label>비밀번호</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" />
                    <Btn type="submit" disabled={loading}>{loading ? "로그인 중..." : "로그인"}</Btn>
                </form>
                {error && <Err>{error}</Err>}
            </Card>
        </Wrap>
    );
};

export default AdminLoginPage;
