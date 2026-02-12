/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { IoClose } from "react-icons/io5";
import { THEME } from "../config/homeproConfig";
import { KR_AREAS } from "../utility/constants";

const RegionSelectModal = ({ open, onClose, onSelect, defaultValue }) => {
  const defaultSido = defaultValue?.sido || "서울";
  const defaultGu = defaultValue?.gu || "전체";

  const [sido, setSido] = useState(defaultSido);
  const [gu, setGu] = useState(defaultGu);

  useEffect(() => {
    if (!open) return;
    setSido(defaultSido);
    setGu(defaultGu);
  }, [open, defaultSido, defaultGu]);

  const sidoList = useMemo(
    () => KR_AREAS.map((x) => x.sido),
    []
  );

  const guList = useMemo(() => {
    const found = KR_AREAS.find((x) => x.sido === sido);
    const list = found?.guList || [];
    return ["전체", ...list];
  }, [sido]);

  useEffect(() => {
    if (!open) return;
    setGu("전체");
  }, [sido, open]);

  const handleConfirm = () => {
    onSelect?.({ sido, gu });
    onClose?.();
  };

  if (!open) return null;

  return (
    <Overlay onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <Handle />
        <Header>
          <Title>지역 선택</Title>
          <CloseBtn onClick={onClose}>
            <IoClose size={22} color={THEME.text} />
          </CloseBtn>
        </Header>

        <Body>
          <ColLeft>
            <List>
              {sidoList.map((s) => (
                <Item key={s} $active={s === sido} onClick={() => setSido(s)}>
                  {s}
                </Item>
              ))}
            </List>
          </ColLeft>
          <ColRight>
            <List>
              {guList.map((g) => (
                <Item key={g} $active={g === gu} onClick={() => setGu(g)}>
                  {g}
                </Item>
              ))}
            </List>
          </ColRight>
        </Body>

        <Footer>
          <GhostBtn onClick={onClose}>취소</GhostBtn>
          <PrimaryBtn onClick={handleConfirm}>적용</PrimaryBtn>
        </Footer>
      </Sheet>
    </Overlay>
  );
};

export default RegionSelectModal;

/* ===================== styles ===================== */

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const Sheet = styled.div`
  width: 100%;
  max-width: 480px;
  height: 62vh;
  max-height: 72vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.28s ease-out;
  padding-bottom: env(safe-area-inset-bottom, 0px);
`;

const Handle = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(0,0,0,0.15);
  margin: 10px auto 0;
  flex-shrink: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 12px;
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
`;

const ColLeft = styled.div`
  width: 110px;
  min-width: 110px;
  border-right: 1px solid ${THEME.border};
  background: ${THEME.background};
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const ColRight = styled.div`
  flex: 1;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 0;
  overscroll-behavior: contain;
`;

const Item = styled.button`
  width: 100%;
  border: none;
  background: ${({ $active }) => ($active ? "rgba(37,99,235,0.08)" : "transparent")};
  color: ${({ $active }) => ($active ? THEME.primary : THEME.textSecondary)};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  text-align: left;
  padding: 13px 18px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  display: block;
  transition: background 0.15s;
  &:active { background: rgba(0,0,0,0.04); }
`;

const Footer = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px 18px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const GhostBtn = styled.button`
  flex: 1;
  height: 46px;
  border-radius: 12px;
  border: 1px solid ${THEME.border};
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  color: ${THEME.muted};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const PrimaryBtn = styled.button`
  flex: 2;
  height: 46px;
  border-radius: 12px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.9; }
`;
