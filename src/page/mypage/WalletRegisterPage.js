/* eslint-disable */
/**
 * 지갑주소 등록 페이지 (시트8 토큰화 대비)
 * URL: /mypage/wallet
 *
 * - 현재 등록된 지갑주소 표시
 * - 신규/변경 입력 + 저장
 * - 향후 포인트 → 토큰 스왑 시 사용됨을 안내
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import { setWalletAddress } from "../../service/PointService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";

const isLikelyWalletAddress = (addr) => {
  if (!addr) return false;
  const v = addr.trim();
  // EVM 계열 0x… 40hex, 또는 26~64자 영숫자 (BTC/Solana 등 폭넓게 허용)
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return true;
  if (/^[a-zA-Z0-9]{26,64}$/.test(v)) return true;
  return false;
};

const WalletRegisterPage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const uid = userData?.uid || "";

  const [currentAddr, setCurrentAddr] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const d = snap.data();
          setCurrentAddr(d.walletAddress || "");
          setInput(d.walletAddress || "");
          setUpdatedAt(d.walletUpdatedAt || null);
        }
      } catch (e) {
        console.error("지갑주소 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const handleSave = async () => {
    if (!uid) { showToast("로그인이 필요합니다"); return; }
    const v = input.trim();
    if (v && !isLikelyWalletAddress(v)) {
      showToast("지갑주소 형식을 다시 확인해주세요");
      return;
    }
    if (v === currentAddr) {
      showToast("변경된 내용이 없습니다");
      return;
    }
    setSaving(true);
    try {
      await setWalletAddress(uid, v || null);
      setCurrentAddr(v);
      showToast(v ? "지갑주소가 저장되었습니다" : "지갑주소가 삭제되었습니다");
    } catch (e) {
      console.error("지갑주소 저장 실패:", e);
      showToast("저장 실패: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setInput("");
  };

  const formatUpdatedAt = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <SimpleBackLayout NAME="지갑주소 등록" hideFooter>
        <CenterMsg>불러오는 중...</CenterMsg>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="지갑주소 등록" hideFooter>
      <Wrap>
        <InfoBox>
          <InfoTitle>지갑주소 등록 안내</InfoTitle>
          <InfoText>
            포인트의 토큰화 전환을 대비해 지갑주소를 미리 등록할 수 있습니다.
            토큰 발행이 시작되면 등록된 지갑으로 발급·전송됩니다.
          </InfoText>
        </InfoBox>

        {currentAddr ? (
          <Card>
            <SectionLabel>현재 등록된 지갑주소</SectionLabel>
            <CurrentAddrBox>{currentAddr}</CurrentAddrBox>
            {updatedAt && (
              <UpdatedAt>마지막 업데이트: {formatUpdatedAt(updatedAt)}</UpdatedAt>
            )}
          </Card>
        ) : (
          <Card>
            <EmptyText>등록된 지갑주소가 없습니다.</EmptyText>
          </Card>
        )}

        <Card>
          <SectionLabel>{currentAddr ? "지갑주소 변경" : "지갑주소 입력"}</SectionLabel>
          <InputRow>
            <AddrInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 0x… (EVM 호환 또는 영숫자 26~64자)"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            {input && (
              <ClearBtn type="button" onClick={handleClear}>✕</ClearBtn>
            )}
          </InputRow>
          <Hint>EVM(이더리움/폴리곤 등): 0x로 시작하는 42자 / 그 외 체인은 영숫자 26~64자</Hint>
          <SaveBtn disabled={saving || !uid} onClick={handleSave}>
            {saving ? "저장 중..." : input.trim() ? "저장하기" : (currentAddr ? "주소 삭제" : "저장하기")}
          </SaveBtn>
        </Card>

        <CautionBox>
          <CautionTitle>⚠️ 주의</CautionTitle>
          <CautionItem>· 본인 소유의 지갑주소만 등록하세요.</CautionItem>
          <CautionItem>· 잘못된 주소로 발급된 토큰은 복구할 수 없습니다.</CautionItem>
          <CautionItem>· 변경 시 이전 주소는 즉시 비활성화됩니다.</CautionItem>
        </CautionBox>

        {toast && <Toast>{toast}</Toast>}
      </Wrap>
    </SimpleBackLayout>
  );
};

export default WalletRegisterPage;

const Wrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding: 8px 0 80px;
`;
const CenterMsg = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: ${THEME.muted};
  font-size: 14px;
`;
const InfoBox = styled.div`
  margin: 8px 12px;
  padding: 14px 16px;
  background: ${THEME.purpleLight};
  border-radius: 12px;
`;
const InfoTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-bottom: 6px;
`;
const InfoText = styled.div`
  font-size: 12px;
  color: ${THEME.textSecondary || THEME.text};
  line-height: 1.6;
`;
const Card = styled.div`
  margin: 8px 12px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;
const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.textSecondary || THEME.muted};
  margin-bottom: 10px;
`;
const CurrentAddrBox = styled.div`
  padding: 12px 14px;
  background: ${THEME.background};
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  color: ${THEME.text};
  word-break: break-all;
  line-height: 1.5;
`;
const UpdatedAt = styled.div`
  font-size: 11px;
  color: ${THEME.muted};
  margin-top: 8px;
`;
const EmptyText = styled.div`
  text-align: center;
  font-size: 13px;
  color: ${THEME.muted};
  padding: 8px 0;
`;
const InputRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;
const AddrInput = styled.input`
  width: 100%;
  padding: 12px 36px 12px 14px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
`;
const ClearBtn = styled.button`
  position: absolute;
  right: 10px;
  background: ${THEME.muted};
  color: #fff;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
`;
const Hint = styled.div`
  font-size: 11px;
  color: ${THEME.muted};
  margin-top: 6px;
  line-height: 1.5;
`;
const SaveBtn = styled.button`
  width: 100%;
  padding: 14px;
  margin-top: 14px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:active { background: ${THEME.primaryDark}; }
  &:disabled { background: #ccc; }
`;
const CautionBox = styled.div`
  margin: 8px 12px 24px;
  padding: 14px 16px;
  background: #FEF3C7;
  border-radius: 12px;
  font-size: 12px;
  color: #78350F;
  line-height: 1.7;
`;
const CautionTitle = styled.div`
  font-weight: 700;
  margin-bottom: 6px;
`;
const CautionItem = styled.div``;
const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  z-index: 9999;
`;
