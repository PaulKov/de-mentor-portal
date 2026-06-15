import type { AcademyCatalog } from '../../core/catalog/domain/academy-catalog.ts'
import type { AcademySession } from '../../core/session/domain/academy-session.ts'

export type PortalSurface =
  | 'hub'
  | 'release'
  | 'workspace'
  | 'session'
  | 'review'
  | 'assessment'
  | 'submission'
  | 'cohort'
  | 'post-lesson'

export type NavigationStatus = 'ready' | 'error'
export type GlobalCommandKind = 'navigate' | 'copy'

export interface GlobalNavigationInput {
  catalog: AcademyCatalog | null
  catalogSource: string
  catalogIsValid: boolean
  session: AcademySession | null
  sessionSource: string
  sessionIsValid: boolean
  activeSurface: unknown
  ledgerReportMarkdown?: string
}

export interface GlobalNavigationItem {
  surface: PortalSurface
  label: string
  description: string
  isActive: boolean
  isEnabled: boolean
  disabledReason: string
}

export interface GlobalNavigationContext {
  primaryLabel: string
  secondaryLabel: string
  catalogStatus: NavigationStatus
  sessionStatus: NavigationStatus
  catalogSource: string
  sessionSource: string
}

export interface GlobalNavigationCommand {
  id: string
  kind: GlobalCommandKind
  label: string
  description: string
  isEnabled: boolean
  disabledReason: string
  surface?: PortalSurface
  value?: string
}

export interface GlobalCommandGroup {
  title: string
  commands: GlobalNavigationCommand[]
}

export interface GlobalNavigationState {
  activeSurface: PortalSurface
  context: GlobalNavigationContext
  items: GlobalNavigationItem[]
  commandGroups: GlobalCommandGroup[]
}

const PORTAL_SURFACES: PortalSurface[] = [
  'hub',
  'release',
  'workspace',
  'session',
  'review',
  'assessment',
  'submission',
  'cohort',
  'post-lesson'
]

const SESSION_REQUIRED_SURFACES = new Set<PortalSurface>([
  'review',
  'assessment',
  'submission',
  'cohort',
  'post-lesson'
])
const CATALOG_REQUIRED_SURFACES = new Set<PortalSurface>(['hub', 'release'])

const SURFACE_COPY: Record<PortalSurface, Pick<GlobalNavigationItem, 'label' | 'description'>> = {
  hub: {
    label: 'Lesson Hub',
    description: 'Каталог направлений, уроков, материалов и launcher-команд.'
  },
  release: {
    label: 'Release Console',
    description: 'Pre-flight go/no-go, артефакты и release-команды.'
  },
  workspace: {
    label: 'Session Workspace',
    description: 'Импорт recent runs и переключение между session.json.'
  },
  session: {
    label: 'Mentor Live Cockpit',
    description: 'Проведение live-урока, stage player, evidence и заметки.'
  },
  review: {
    label: 'Review Center',
    description: 'Handoff-отчет, риски, рекомендации и next actions.'
  },
  assessment: {
    label: 'Skill Assessment Center',
    description: 'Оценка skill mastery, evidence sources и learning path на следующий урок.'
  },
  submission: {
    label: 'Submission Inbox',
    description: 'Сдача домашки и проверка evidence от ученика.'
  },
  cohort: {
    label: 'Cohort Dashboard',
    description: 'Сводка по learners, gaps, submissions и heatmap.'
  },
  'post-lesson': {
    label: 'Post-Lesson Pack',
    description: 'Единый пакет после урока: review, ledger, homework, blockers и next lesson.'
  }
}

export const createPortalSurfaceStorageKey = () => 'academy-portal-surface'

export const normalizePortalSurface = (surface: unknown): PortalSurface =>
  typeof surface === 'string' && PORTAL_SURFACES.includes(surface as PortalSurface)
    ? surface as PortalSurface
    : 'hub'

export const buildGlobalNavigationState = (
  input: GlobalNavigationInput
): GlobalNavigationState => {
  const activeSurface = resolveActiveSurface(input)
  const items = PORTAL_SURFACES.map(surface =>
    createNavigationItem(surface, activeSurface, input)
  )

  return {
    activeSurface,
    context: createContext(input),
    items,
    commandGroups: createCommandGroups(input, items)
  }
}

const resolveActiveSurface = (input: GlobalNavigationInput): PortalSurface => {
  const surface = normalizePortalSurface(input.activeSurface)
  const canUseCatalogSurface = !CATALOG_REQUIRED_SURFACES.has(surface) ||
    Boolean(input.catalog && input.catalogIsValid)
  const canUseSessionSurface = !SESSION_REQUIRED_SURFACES.has(surface) ||
    Boolean(input.session && input.sessionIsValid)

  if (canUseCatalogSurface && canUseSessionSurface) {
    return surface
  }

  return 'session'
}

const createNavigationItem = (
  surface: PortalSurface,
  activeSurface: PortalSurface,
  input: GlobalNavigationInput
): GlobalNavigationItem => {
  const catalogMissing = CATALOG_REQUIRED_SURFACES.has(surface) &&
    !(input.catalog && input.catalogIsValid)
  const sessionMissing = SESSION_REQUIRED_SURFACES.has(surface) &&
    !(input.session && input.sessionIsValid)

  return {
    surface,
    label: SURFACE_COPY[surface].label,
    description: SURFACE_COPY[surface].description,
    isActive: surface === activeSurface,
    isEnabled: !(catalogMissing || sessionMissing),
    disabledReason: catalogMissing
      ? 'Нужен валидный academy-catalog.'
      : sessionMissing ? 'Нужна валидная session.' : ''
  }
}

const createContext = (input: GlobalNavigationInput): GlobalNavigationContext => ({
  primaryLabel: input.session
    ? `${input.session.student_name} · ${input.session.lab_name}`
    : 'Сессия не загружена',
  secondaryLabel: input.catalog && input.catalogIsValid
    ? `${input.catalog.tracks.length} направлений · ${input.catalogSource}`
    : `Каталог недоступен · ${input.catalogSource}`,
  catalogStatus: input.catalog && input.catalogIsValid ? 'ready' : 'error',
  sessionStatus: input.session && input.sessionIsValid ? 'ready' : 'error',
  catalogSource: input.catalogSource,
  sessionSource: input.sessionSource
})

const createCommandGroups = (
  input: GlobalNavigationInput,
  items: GlobalNavigationItem[]
): GlobalCommandGroup[] => [
  {
    title: 'Навигация',
    commands: items.map(item => ({
      id: `open-${item.surface}`,
      kind: 'navigate',
      label: `Открыть ${item.label}`,
      description: item.description,
      isEnabled: item.isEnabled,
      disabledReason: item.disabledReason,
      surface: item.surface
    }))
  },
  {
    title: 'Команды портала',
    commands: createCopyCommands(input)
  }
].filter(group => group.commands.length > 0)

const createCopyCommands = (input: GlobalNavigationInput): GlobalNavigationCommand[] => {
  const portalActions = input.session?.control_plane?.portal_actions
  const currentStageGuide = input.session?.control_plane?.mentor_mode.stage_guides.find(
    guide => guide.stage_code === input.session?.current_stage.code
  )
  const commands = [
    createCopyCommand('copy-portal-start', 'Скопировать запуск портала', portalActions?.start_command),
    createCopyCommand('copy-portal-open', 'Скопировать open-команду', portalActions?.open_command),
    createCopyCommand('copy-portal-export', 'Скопировать export-команду', portalActions?.export_command),
    createCopyCommand('copy-release-verify', 'Скопировать release verify', findReleaseVerifyCommand(input.session)),
    createCopyCommand('copy-ledger-report', 'Скопировать ledger report', input.ledgerReportMarkdown),
    createCopyCommand('copy-current-stage-command', 'Скопировать команду текущего этапа', input.session?.current_stage.command),
    createCopyCommand('copy-current-stage-question', 'Скопировать вопрос текущего этапа', currentStageGuide?.question)
  ]

  return commands.filter((command): command is GlobalNavigationCommand => Boolean(command))
}

const createCopyCommand = (
  id: string,
  label: string,
  value?: string
): GlobalNavigationCommand | null => value
  ? {
      id,
      kind: 'copy',
      label,
      description: value,
      isEnabled: true,
      disabledReason: '',
      value
    }
  : null

const findReleaseVerifyCommand = (session: AcademySession | null) =>
  [
    ...(session?.commands ?? []),
    ...(session?.control_plane?.student_mode.self_check_commands ?? [])
  ].find(command => command.includes('lesson-release') && command.includes('verify'))
