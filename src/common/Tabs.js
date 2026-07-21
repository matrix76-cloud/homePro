import React from "react";
import styled from "styled-components";
import { THEME } from "../config/homeproConfig";

// 공통 탭 — 2~N등분 균등, 활성=크게+블루 밑줄(숨고 스타일). 탭 화면 공통 컴포넌트.
//   tabs: ["문자열", ...] 또는 [{ key, label }, ...]
//   active: 현재 활성 key(문자열 배열이면 그 문자열)
//   onChange(key)
//   size: "lg"(기본, 최상위 2탭용 17px) | "sm"(하위 탭 14px)
export default function Tabs({ tabs = [], active, onChange, size = "lg" }) {
  return (
    <TabRow>
      {tabs.map((t) => {
        const key = typeof t === "string" ? t : t.key;
        const label = typeof t === "string" ? t : t.label;
        return (
          <TabItem
            key={key}
            $active={active === key}
            $size={size}
            onClick={() => onChange && onChange(key)}
          >
            {label}
          </TabItem>
        );
      })}
    </TabRow>
  );
}

const TabRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${THEME.border};
  background: ${THEME.surface};
`;

const TabItem = styled.div`
  flex: 1;
  text-align: center;
  padding: ${({ $size }) => ($size === "sm" ? "11px 0" : "16px 0")};
  font-size: ${({ $size }) => ($size === "sm" ? "14px" : "17px")};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active }) => ($active ? THEME.text : THEME.muted)};
  border-bottom: 3px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 0.15s;
  &:active { opacity: 0.7; }
`;
