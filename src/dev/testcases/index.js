// 실기기 테스트 케이스 — 도메인별 파일을 여기서 합친다. (seekone 방식 이식 2026-07-30)
//  케이스가 많아지면 group 으로 묶어 리뷰페이지 실기기 테스트 탭 안의 서브탭으로 본다.
//
//  ★ 그룹(카테고리) 구성은 형이 이 프로젝트에 맞게 확정해서 알려줄 예정.
//    그룹 추가 방법: ① testcases/<이름>.js 에 케이스 배열 export
//                   ② 아래 import + TEST_GROUPS·TEST_REVIEW 에 한 줄씩 추가
//
//  케이스 스키마
//   { id, no, name, target, minutes, steps:[{ do, see }], expect, also[], group }
//    · steps 한 단계 = 형이 [됨]/[안 됨]을 한 번 누르는 단위
//    · 결과는 reviewThreads 에 "[완료] n단계"/"[미완료] n단계 — 사유" 로 쌓인다
//    · [미완료]는 미답변으로 잡혀 카스 점검 큐에 자동으로 들어온다
import { TEST_CORE } from './core.js'
import { TEST_BOUNDARY } from './boundary.js'

const g = (group, list) => list.map((c) => ({ ...c, group }))

export const TEST_GROUPS = ['핵심 점검', '경계값 검증']

export const TEST_REVIEW = [
  ...g('핵심 점검', TEST_CORE),        // 짧게 한 바퀴 — 이것부터 돌린다
  ...g('경계값 검증', TEST_BOUNDARY), // 딱 그 값 / 하나 넘은 값에서 갈리는 지점
]
