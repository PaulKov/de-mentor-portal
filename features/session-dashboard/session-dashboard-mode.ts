import type { AcademySession } from '../../core/session/domain/academy-session.ts'

export type DashboardMode = 'mentor' | 'student'

export const createDashboardModeStorageKey = (session: AcademySession) =>
  [
    'session-dashboard-mode',
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

export const normalizeDashboardMode = (value: unknown): DashboardMode =>
  value === 'student' || value === 'mentor' ? value : 'mentor'
