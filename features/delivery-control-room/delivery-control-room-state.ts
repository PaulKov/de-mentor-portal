import type { AcademySession } from '../../core/session/domain/academy-session.ts'
import type { MentorCockpitState } from '../mentor-cockpit/mentor-cockpit-state.ts'

export type DeliveryTimerStatus = 'idle' | 'running' | 'paused'
export type DeliveryPanicMode = 'lab-blocked' | 'sql-error' | 'student-stuck'

export interface DeliveryTimerState {
  stageCode: string
  status: DeliveryTimerStatus
  elapsedSeconds: number
}

export interface DeliveryControlRoomLocalState {
  timer: DeliveryTimerState
  panicMode: DeliveryPanicMode | null
}

export interface DeliveryFocusCard {
  label: string
  body: string
}

export interface DeliveryPanicGuide {
  mode: DeliveryPanicMode
  title: string
  action: string
  detail: string
}

export interface DeliveryEvidenceAction {
  label: string
  title: string
}

export interface DeliveryControlRoomState {
  selectedStageCode: string
  stageIndexLabel: string
  plannedSeconds: number
  elapsedSeconds: number
  remainingSeconds: number
  progressPercent: number
  timerLabel: string
  remainingLabel: string
  timerStatusLabel: DeliveryTimerStatus
  primaryCommand: string
  focusCards: DeliveryFocusCard[]
  panicGuides: DeliveryPanicGuide[]
  activePanicGuide?: DeliveryPanicGuide
  evidenceAction?: DeliveryEvidenceAction
}

const TIMER_STATUSES = new Set<DeliveryTimerStatus>(['idle', 'running', 'paused'])
const PANIC_MODES = new Set<DeliveryPanicMode>(['lab-blocked', 'sql-error', 'student-stuck'])

export const createDeliveryControlRoomStorageKey = (session: AcademySession) =>
  [
    'delivery-control-room',
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

export const buildDeliveryControlRoomState = (
  cockpitState: MentorCockpitState,
  localState?: Partial<DeliveryControlRoomLocalState> | null
): DeliveryControlRoomState => {
  const plannedSeconds = parseTimeboxSeconds(cockpitState.selectedStage.timebox)
  const normalized = normalizeDeliveryControlRoomLocalState(
    localState,
    cockpitState.selectedStage.code,
    plannedSeconds
  )
  const stageIndex = cockpitState.stages.findIndex(
    stage => stage.code === cockpitState.selectedStage.code
  )
  const elapsedSeconds = normalized.timer.elapsedSeconds
  const remainingSeconds = Math.max(plannedSeconds - elapsedSeconds, 0)
  const panicGuides = createPanicGuides()

  return {
    selectedStageCode: cockpitState.selectedStage.code,
    stageIndexLabel: `Stage ${stageIndex + 1} / ${cockpitState.stages.length}`,
    plannedSeconds,
    elapsedSeconds,
    remainingSeconds,
    progressPercent: plannedSeconds === 0 ? 0 : Math.round(elapsedSeconds / plannedSeconds * 100),
    timerLabel: formatDuration(elapsedSeconds),
    remainingLabel: formatDuration(remainingSeconds),
    timerStatusLabel: normalized.timer.status,
    primaryCommand: cockpitState.selectedStage.command,
    focusCards: createFocusCards(cockpitState),
    panicGuides,
    activePanicGuide: panicGuides.find(guide => guide.mode === normalized.panicMode),
    evidenceAction: createEvidenceAction(cockpitState)
  }
}

export const normalizeDeliveryControlRoomLocalState = (
  state: Partial<DeliveryControlRoomLocalState> | null | undefined,
  selectedStageCode: string,
  plannedSeconds: number
): DeliveryControlRoomLocalState => {
  const timer = state?.timer
  const status = TIMER_STATUSES.has(timer?.status as DeliveryTimerStatus)
    ? timer?.status as DeliveryTimerStatus
    : 'idle'
  const elapsedSeconds = clampSeconds(timer?.elapsedSeconds, plannedSeconds)
  const stageCode = timer?.stageCode === selectedStageCode ? timer.stageCode : selectedStageCode
  const panicMode = PANIC_MODES.has(state?.panicMode as DeliveryPanicMode)
    ? state?.panicMode as DeliveryPanicMode
    : null

  return {
    timer: {
      stageCode,
      status,
      elapsedSeconds
    },
    panicMode
  }
}

export const parseTimeboxSeconds = (timebox: string) => {
  const match = timebox.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/)
  if (!match) {
    return 0
  }

  const [, startMinute, startSecond, endMinute, endSecond] = match.map(Number)
  return Math.max((endMinute * 60 + endSecond) - (startMinute * 60 + startSecond), 0)
}

export const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(Math.round(seconds), 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60

  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

const createFocusCards = (cockpitState: MentorCockpitState): DeliveryFocusCard[] => [
  {
    label: 'Что сказать',
    body: cockpitState.selectedGuide?.mentor_script || cockpitState.selectedStage.mentor_focus
  },
  {
    label: 'Что показать',
    body: cockpitState.commands.join('\n')
  },
  {
    label: 'Что спросить',
    body: cockpitState.selectedGuide?.question ||
      'Попросить ученика объяснить ход решения своими словами.'
  },
  {
    label: 'Как проверить',
    body: cockpitState.selectedGuide?.verification ||
      cockpitState.selectedStage.student_action
  }
]

const createEvidenceAction = (cockpitState: MentorCockpitState): DeliveryEvidenceAction | undefined => {
  const evidence = cockpitState.evidenceItems[0]

  return evidence ? { label: `Mark evidence: ${evidence.title}`, title: evidence.title } : undefined
}

const createPanicGuides = (): DeliveryPanicGuide[] => [
  {
    mode: 'lab-blocked',
    title: 'Стенд не поднялся',
    action: 'Fallback: открыть workbook/runbook',
    detail: 'Перейди к explain-by-diagram: покажи команды из workbook и зафиксируй environment gap.'
  },
  {
    mode: 'sql-error',
    title: 'SQL не работает',
    action: 'Fallback: разобрать expected plan',
    detail: 'Скопируй failing query, проверь schema/data preflight и сравни с ожидаемым EXPLAIN.'
  },
  {
    mode: 'student-stuck',
    title: 'Ученик отстал',
    action: 'Fallback: перейти к guided path',
    detail: 'Сузь задачу до одного вопроса, дай подсказку и попроси проговорить следующий шаг.'
  }
]

const clampSeconds = (value: unknown, maxSeconds: number) => {
  const seconds = typeof value === 'number' && Number.isFinite(value) ? value : 0

  return Math.min(Math.max(Math.round(seconds), 0), Math.max(maxSeconds, 0))
}
