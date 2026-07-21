/* eslint-disable */
import React from "react";
import styled from "styled-components";

export const GRADE_ORDER = ["rookie", "bronze", "silver", "gold", "diamond", "master"];

const DEFAULT_RULES = {
    rookie:  { label: "루키", minPoints: 0, color: "#9CA3AF" },
    bronze:  { label: "브론즈", minPoints: 500, color: "#A1887F" },
    silver:  { label: "실버", minPoints: 2000, color: "#90A4AE" },
    gold:    { label: "골드", minPoints: 5000, color: "#F59E0B" },
    diamond: { label: "다이아", minPoints: 15000, color: "#2571e3" },
    master:  { label: "마스터", minPoints: 50000, color: "#EF4444" },
};

/** 누적 포인트로 등급 계산 */
export function calcGrade(totalEarnedPoints, gradeRules) {
    const rules = gradeRules || DEFAULT_RULES;
    let result = { key: "rookie", ...rules.rookie };
    for (const key of [...GRADE_ORDER].reverse()) {
        const rule = rules[key];
        if (rule && totalEarnedPoints >= rule.minPoints) {
            result = { key, ...rule };
            break;
        }
    }
    return result;
}

/** 다음 등급까지 정보 */
export function getNextGradeInfo(totalEarnedPoints, gradeRules) {
    const rules = gradeRules || DEFAULT_RULES;
    const current = calcGrade(totalEarnedPoints, rules);
    const idx = GRADE_ORDER.indexOf(current.key);
    if (idx >= GRADE_ORDER.length - 1) {
        return { nextLabel: null, remaining: 0, progress: 1 };
    }
    const nextKey = GRADE_ORDER[idx + 1];
    const nextRule = rules[nextKey];
    const currentMin = rules[current.key]?.minPoints || 0;
    const nextMin = nextRule.minPoints;
    const range = nextMin - currentMin;
    const earned = totalEarnedPoints - currentMin;
    return {
        nextLabel: nextRule.label,
        nextColor: nextRule.color,
        remaining: nextMin - totalEarnedPoints,
        progress: range > 0 ? Math.min(earned / range, 1) : 0,
    };
}

/** 등급 뱃지 컴포넌트 */
export const GradeBadge = ({ grade, gradeRules, size = "sm" }) => {
    const rules = gradeRules || DEFAULT_RULES;
    const key = grade || "rookie";
    const rule = rules[key] || rules.rookie;
    const isSm = size === "sm";
    return (
        <BadgeWrap $color={rule.color} $sm={isSm}>
            <BadgeDot $color={rule.color} $sm={isSm} />
            <BadgeLabel $sm={isSm}>{rule.label}</BadgeLabel>
        </BadgeWrap>
    );
};

/** 등급 프로그레스 바 */
export const GradeProgressBar = ({ totalEarnedPoints, gradeRules }) => {
    const info = getNextGradeInfo(totalEarnedPoints, gradeRules);
    const current = calcGrade(totalEarnedPoints, gradeRules);
    if (!info.nextLabel) {
        return (
            <ProgressWrap>
                <ProgressLabel>{current.label} — 최고 등급 달성!</ProgressLabel>
                <ProgressTrack><ProgressFill $width={100} $color={current.color} /></ProgressTrack>
            </ProgressWrap>
        );
    }
    return (
        <ProgressWrap>
            <ProgressLabel>
                {info.remaining.toLocaleString()}P 더 모으면 <strong style={{ color: info.nextColor }}>{info.nextLabel}</strong> 등급이에요!
            </ProgressLabel>
            <ProgressTrack>
                <ProgressFill $width={info.progress * 100} $color={current.color} />
            </ProgressTrack>
        </ProgressWrap>
    );
};

/* ── styles ── */
const BadgeWrap = styled.span`
    display: inline-flex;
    align-items: center;
    gap: ${({ $sm }) => $sm ? "3px" : "4px"};
    padding: ${({ $sm }) => $sm ? "2px 6px" : "3px 8px"};
    border-radius: 20px;
    background: ${({ $color }) => $color}15;
`;

const BadgeDot = styled.span`
    width: ${({ $sm }) => $sm ? "6px" : "8px"};
    height: ${({ $sm }) => $sm ? "6px" : "8px"};
    border-radius: 50%;
    background: ${({ $color }) => $color};
`;

const BadgeLabel = styled.span`
    font-size: ${({ $sm }) => $sm ? "11px" : "12px"};
    font-weight: 600;
    color: ${({ $color }) => $color};
`;

const ProgressWrap = styled.div`
    margin-top: 8px;
`;

const ProgressLabel = styled.div`
    font-size: 12px;
    font-weight: 400;
    color: #6B7280;
    margin-bottom: 6px;
    strong { font-weight: 600; }
`;

const ProgressTrack = styled.div`
    width: 100%;
    height: 10px;
    border-radius: 5px;
    background: #e7f0fd;
    overflow: hidden;
`;

const ProgressFill = styled.div`
    width: ${({ $width }) => $width}%;
    height: 100%;
    border-radius: 5px;
    background: #2571e3;
    transition: width 0.3s ease;
`;
