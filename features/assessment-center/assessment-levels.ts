export type AssessmentSkillLevel =
  | 'not-started'
  | 'aware'
  | 'can-repeat'
  | 'can-explain'
  | 'can-apply'

export const ASSESSMENT_LEVEL_SCORE: Record<AssessmentSkillLevel, number> = {
  'not-started': 0,
  aware: 1,
  'can-repeat': 2,
  'can-explain': 3,
  'can-apply': 4
}
