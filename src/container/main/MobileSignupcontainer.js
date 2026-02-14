/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";

import { watchAuthState, signUpWithEmailPassword } from "../../service/AuthService";
import { THEME } from "../../config/homeproConfig";

const safeTrim = (v) => String(v ?? "").trim();

export default function MobileSignupcontainer() {
    const nav = useNavigate();

    const [checkingAuth, setCheckingAuth] = useState(true);
    const [busy, setBusy] = useState(false);

    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [name, setName] = useState("");

    const unsubRef = useRef(null);
    const routedRef = useRef(false);

    useEffect(() => {
        unsubRef.current = watchAuthState((user) => {
            setCheckingAuth(false);
            if (user && !routedRef.current) {
                routedRef.current = true;
                nav("/MobileLinkPhone", { replace: true });
            }
        });

        return () => {
            try {
                if (unsubRef.current) unsubRef.current();
            } catch (e) { }
        };
    }, [nav]);

    const canSubmit = useMemo(() => {
        const e = safeTrim(email);
        const p = safeTrim(pw);
        const p2 = safeTrim(pw2);
        if (!e || !p || !p2) return false;
        if (p.length < 6) return false;
        if (p !== p2) return false;
        return true;
    }, [email, pw, pw2]);

    const handleSubmit = useCallback(async () => {
        if (busy) return;

        const e = safeTrim(email);
        const p = safeTrim(pw);
        const p2 = safeTrim(pw2);
        const n = safeTrim(name);

        if (!e) return window.alert("이메일을 입력해주세요.");
        if (!p) return window.alert("비밀번호를 입력해주세요.");
        if (p.length < 6) return window.alert("비밀번호는 6자 이상으로 해주세요.");
        if (p !== p2) return window.alert("비밀번호가 일치하지 않아요.");

        setBusy(true);
        try {
            const res = await signUpWithEmailPassword({
                email: e,
                password: p,
                displayName: n,
            });

            if (!res || res.success !== true) {
                const msg = res?.message || res?.error_message || "가입에 실패했습니다.";
                window.alert(msg);
                return;
            }
            // watchAuthState가 감지 → /MobileLinkPhone 이동
        } catch (err) {
            window.alert("가입에 실패했습니다.");
        } finally {
            setBusy(false);
        }
    }, [busy, email, pw, pw2, name]);

    return (
        <Wrap>
            {(checkingAuth || busy) && (
                <Overlay>
                    <OverlayInner>
                        <MiniSpinner />
                        <OverlayText>{busy ? "가입 처리 중…" : "확인 중…"}</OverlayText>
                    </OverlayInner>
                </Overlay>
            )}

            <Head>
                <H1>회원가입</H1>
            </Head>

            <Card>
                <Field>
                    <Label>이메일</Label>
                    <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        inputMode="email"
                        autoComplete="email"
                    />
                </Field>

                <Field>
                    <Label>비밀번호</Label>
                    <Input
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        placeholder="6자 이상"
                        type="password"
                        autoComplete="new-password"
                    />
                </Field>

                <Field>
                    <Label>비밀번호 확인</Label>
                    <Input
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value)}
                        placeholder="한 번 더 입력"
                        type="password"
                        autoComplete="new-password"
                    />
                </Field>

                <Field>
                    <Label>이름(선택)</Label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="홍길동"
                        autoComplete="name"
                    />
                </Field>

                <BtnRow>
                    <PrimaryBtn type="button" disabled={!canSubmit || busy || checkingAuth} onClick={handleSubmit}>
                        가입 완료
                    </PrimaryBtn>

                    <GhostBtn
                        type="button"
                        disabled={busy || checkingAuth}
                        onClick={() => nav("/MobileLogin", { replace: true })}
                    >
                        로그인으로
                    </GhostBtn>
                </BtnRow>
            </Card>
        </Wrap>
    );
}

/* ===================== styles ===================== */

const popIn = keyframes`
  0% { opacity: 0; transform: translateY(10px) scale(.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Wrap = styled.div`
  min-height: 100vh;
  padding: 28px 20px 18px;
  background: #EFF6FF;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
`;

const Head = styled.div`
  width: 100%;
  max-width: 420px;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: ${popIn} 0.55s ease-out both;
  animation-delay: 0.06s;
`;

const H1 = styled.div`
  font-size: 20px !important;
  font-weight: 400;
  letter-spacing: -0.03em;
  color: rgba(17, 24, 39, 0.92);
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 14px 26px rgba(17, 24, 39, 0.06);
  animation: ${popIn} 0.55s ease-out both;
  animation-delay: 0.12s;
  box-sizing: border-box;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`;

const Label = styled.div`
  font-size: 12.5px !important;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: rgba(17, 24, 39, 0.72);
`;

const Input = styled.input`
  width: 100%;
  height: 52px;
  border-radius: 16px;
  padding: 0 16px;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
  font-size: 15px !important;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: rgba(17, 24, 39, 0.9);
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(17, 24, 39, 0.35);
    font-weight: 400;
  }

  &:focus {
    border-color: rgba(37, 99, 235, 0.30);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.10);
  }
`;

const BtnRow = styled.div`
  width: 100%;
  display: flex;
  gap: 12px;
  margin-top: 6px;
`;

const PrimaryBtn = styled.button`
  flex: 1;
  min-width: 0;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(180deg, ${THEME.primary}dd 0%, ${THEME.primary}cc 100%);
  border: 1px solid ${THEME.primary}33;
  box-shadow: 0 10px 22px ${THEME.primary}22;
  color: rgba(255, 255, 255, 0.92);
  font-size: 15px !important;
  font-weight: 400;
  letter-spacing: -0.03em;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
`;

const GhostBtn = styled.button`
  flex: 1;
  min-width: 0;
  height: 48px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid ${THEME.primary}2e;
  box-shadow: 0 10px 18px rgba(17, 24, 39, 0.06);
  color: rgba(17, 24, 39, 0.86);
  font-size: 15px !important;
  font-weight: 400;
  letter-spacing: -0.03em;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const OverlayInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const OverlayText = styled.div`
  font-size: 13px !important;
  font-weight: 400;
  color: rgba(17, 24, 39, 0.55);
`;

const MiniSpinner = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(0, 0, 0, 0.12);
  border-top-color: ${THEME.primary};
  animation: ${spin} 0.9s linear infinite;
`;
