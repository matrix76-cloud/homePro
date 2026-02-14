/* eslint-disable */
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { watchAuthState } from "../../service/AuthService";
import { getUserProfileByUid, upsertUserProfile } from "../../service/UserProfileService";
import { UserContext } from "../../context/User";
import { THEME } from "../../config/homeproConfig";
import localforage from "localforage";

const ADJ2 = ["밝은", "맑은", "고운", "푸른", "작은", "예쁜", "귀한", "깊은", "넓은", "높은"];
const ADJ3 = ["따뜻한", "든든한", "다정한", "씩씩한", "행복한", "소중한", "건강한", "활발한", "정직한", "용감한"];
const NOUN1 = ["별", "달", "꽃", "곰", "해", "숲", "빛", "새"];
const NOUN2 = ["하늘", "나무", "구름", "토끼", "바다", "사슴", "매화", "참새"];
const NOUN3 = ["고양이", "다람쥐", "강아지"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function generateNickname() {
    const pairs = [
        [ADJ2, NOUN1], [ADJ2, NOUN2], [ADJ2, NOUN3],
        [ADJ3, NOUN1], [ADJ3, NOUN2], [ADJ3, NOUN3],
    ];
    const [adjArr, nounArr] = pick(pairs);
    const adj = pick(adjArr);
    const noun = pick(nounArr);
    if (adj.length + noun.length <= 6) return adj + noun;
    return pick(ADJ2) + pick(NOUN1);
}

export default function MobileSetNicknamecontainer() {
    const nav = useNavigate();
    const { dispatch } = React.useContext(UserContext);

    const [uid, setUid] = useState("");
    const [nickname, setNickname] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const unsub = watchAuthState((user) => {
            if (!user?.uid) {
                nav("/MobileLogin", { replace: true });
                return;
            }
            setUid(user.uid);
        });
        return () => { try { unsub?.(); } catch (e) { } };
    }, [nav]);

    useEffect(() => {
        setNickname(generateNickname());
    }, []);

    const handleGenerate = () => {
        setNickname(generateNickname());
    };

    const handleChange = (e) => {
        const v = e.target.value;
        if ([...v].length > 6) return;
        setNickname(v);
    };

    const handleComplete = async () => {
        const trimmed = nickname.trim();
        if (!trimmed) {
            window.alert("대화명을 입력해주세요.");
            return;
        }
        if (!uid) return;
        if (busy) return;

        setBusy(true);
        try {
            const primaryUid = localStorage.getItem("__primaryUid") || uid;

            await upsertUserProfile(primaryUid, { nickname: trimmed });
            if (primaryUid !== uid) {
                await upsertUserProfile(uid, { nickname: trimmed });
            }

            const profile = await getUserProfileByUid(primaryUid);
            const phoneE164 = profile?.phoneE164 || "";

            if (phoneE164) {
                await localforage.setItem("user_phone", phoneE164);
            }

            dispatch({
                USERS_ID: primaryUid,
                USERINFO: { nickname: trimmed, phone: phoneE164 },
            });
            nav("/MobileMain", { replace: true });
        } catch (e) {
            window.alert("저장에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setBusy(false);
        }
    };

    const charCount = [...nickname].length;

    return (
        <Wrap>
            <Title>대화명 설정</Title>
            <Desc>다른 사용자에게 보여질 이름이에요</Desc>

            <Card>
                <Field>
                    <LabelRow>
                        <Label>대화명</Label>
                        <RequiredMark>*</RequiredMark>
                    </LabelRow>

                    <InlineRow>
                        <InputWrap>
                            <Input
                                type="text"
                                placeholder="대화명을 입력하세요"
                                value={nickname}
                                onChange={handleChange}
                                disabled={busy}
                                maxLength={6}
                            />
                            <CharCount $over={charCount > 5}>{charCount}/6</CharCount>
                        </InputWrap>

                        <SmallBtn type="button" onClick={handleGenerate} disabled={busy}>
                            자동 생성
                        </SmallBtn>
                    </InlineRow>

                    <HelperText>한글, 영문, 숫자 조합 최대 6자</HelperText>

                    {nickname.trim() && (
                        <Preview>
                            미리보기: <strong>{nickname.trim()}</strong>
                        </Preview>
                    )}
                </Field>

                <BtnRow>
                    <PrimaryBtn type="button" onClick={handleComplete} disabled={!nickname.trim() || busy}>
                        {busy ? "저장중..." : "완료"}
                    </PrimaryBtn>
                </BtnRow>
            </Card>
        </Wrap>
    );
}

/* ===================== styles ===================== */

const Wrap = styled.div`
  min-height: 100vh;
  background: #EFF6FF;
  padding: 26px 20px;
  box-sizing: border-box;
`;

const Title = styled.div`
  font-size: 22px !important;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: rgba(17, 24, 39, 0.92);
`;

const Desc = styled.div`
  margin-top: 6px;
  font-size: 13px !important;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: rgba(17, 24, 39, 0.55);
`;

const Card = styled.div`
  margin-top: 16px;
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  padding: 16px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 14px !important;
  color: rgba(17, 24, 39, 0.92);
  font-weight: 400;
`;

const RequiredMark = styled.span`
  color: #ff4b4b;
  font-size: 14px !important;
  font-weight: 400;
`;

const InlineRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
`;

const InputWrap = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  border: none;
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
  padding: 10px 40px 10px 0;
  font-size: 16px !important;
  outline: none;
  background: transparent;
  box-sizing: border-box;

  &::placeholder { color: rgba(17, 24, 39, 0.38); }
  &:focus { border-bottom-color: ${THEME.primary}b3; }
`;

const CharCount = styled.span`
  position: absolute;
  right: 0;
  bottom: 12px;
  font-size: 12px !important;
  font-weight: 400;
  color: ${({ $over }) => ($over ? "#ef4444" : "rgba(17, 24, 39, 0.4)")};
`;

const SmallBtn = styled.button`
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  padding: 12px 12px;
  font-size: 14px !important;
  cursor: pointer;
  color: rgba(17, 24, 39, 0.92);
  font-weight: 400;
  flex-shrink: 0;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 13px !important;
  color: rgba(17, 24, 39, 0.48);
  font-weight: 400;
`;

const Preview = styled.div`
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(249, 250, 251, 0.9);
  border: 1px dashed rgba(15, 23, 42, 0.12);
  font-size: 14px !important;
  color: rgba(17, 24, 39, 0.75);
  font-weight: 400;

  strong {
    color: ${THEME.primary};
    font-weight: 400;
  }
`;

const BtnRow = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PrimaryBtn = styled.button`
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  border-radius: 14px;
  padding: 13px 14px;
  font-size: 16px !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: ${THEME.primary}eb;
  color: #ffffff;
  font-weight: 400;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;
