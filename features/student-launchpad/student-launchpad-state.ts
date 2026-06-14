import type { AcademySession } from '../../core/session/domain/academy-session.ts'
import type {
  ControlPlaneArtifact,
  NextLesson,
  StudentMode
} from '../../core/session/domain/control-plane.ts'

export type StudentPlatformCode = 'macos' | 'windows' | 'linux'

export interface StudentPlatform {
  code: StudentPlatformCode
  label: string
}

export interface ReadinessStep {
  id: string
  title: string
  command: string
  verification: string
  note: string
}

export interface StudentResource {
  kind: 'prep' | 'workbook' | 'homework'
  label: string
  path: string
  description: string
}

export interface StudentLaunchpadState {
  selectedPlatform: StudentPlatform
  platforms: StudentPlatform[]
  readinessSteps: ReadinessStep[]
  resources: StudentResource[]
  artifacts: ControlPlaneArtifact[]
  selfCheckCommands: string[]
  portalCommands: string[]
  handoffItems: string[]
  nextLesson?: NextLesson
}

const PLATFORMS: StudentPlatform[] = [
  { code: 'macos', label: 'macOS' },
  { code: 'windows', label: 'Windows + WSL2' },
  { code: 'linux', label: 'Linux' }
]

const READINESS_STEPS: Record<StudentPlatformCode, ReadinessStep[]> = {
  macos: [
    {
      id: 'docker-desktop',
      title: 'Docker Desktop запущен',
      command: 'docker --version && docker compose version',
      verification: 'Команды возвращают версии Docker Engine и Compose.',
      note: 'Для Apple Silicon включи Rosetta только если образ явно этого требует.'
    },
    {
      id: 'developer-tools',
      title: 'CLI-инструменты доступны',
      command: 'git --version && python3 --version && node --version',
      verification: 'Есть Git, Python 3 и Node.js для CLI портала и mentor-lab.',
      note: 'Если Node.js нет, удобнее поставить LTS через nvm или Homebrew.'
    }
  ],
  windows: [
    {
      id: 'wsl2',
      title: 'WSL2 включен',
      command: 'wsl --status',
      verification: 'Default Version равен 2, установлен Ubuntu или другой Linux-дистрибутив.',
      note: 'Команду запускай в PowerShell; labs и git удобнее выполнять внутри WSL.'
    },
    {
      id: 'docker-wsl',
      title: 'Docker Desktop подключен к WSL2',
      command: 'docker --version && docker compose version',
      verification: 'Команды выполняются внутри WSL и видят Docker Engine.',
      note: 'В Docker Desktop включи WSL integration для выбранного дистрибутива.'
    }
  ],
  linux: [
    {
      id: 'docker-linux',
      title: 'Docker Engine и Compose установлены',
      command: 'docker --version && docker compose version',
      verification: 'Пользователь может запускать Docker без ручного sudo для каждого шага.',
      note: 'После добавления в docker group может потребоваться перелогиниться.'
    },
    {
      id: 'runtime-linux',
      title: 'Инструменты урока доступны',
      command: 'git --version && python3 --version && node --version',
      verification: 'Git, Python 3 и Node.js возвращают версии.',
      note: 'Node.js нужен для портала, Python 3 нужен для mentor-lab CLI.'
    }
  ]
}

export const createStudentLaunchpadStorageKey = (session: AcademySession) =>
  [
    'student-launchpad',
    session.contract_version,
    session.lab_name,
    session.student_name,
    session.created_at
  ].join(':')

export const normalizeStudentPlatform = (value: unknown): StudentPlatformCode =>
  PLATFORMS.some(platform => platform.code === value) ? value as StudentPlatformCode : 'macos'

export const buildStudentLaunchpadState = (
  session: AcademySession,
  platform: StudentPlatformCode = 'macos'
): StudentLaunchpadState => {
  const selectedPlatformCode = normalizeStudentPlatform(platform)
  const controlPlane = session.control_plane

  return {
    selectedPlatform: findPlatform(selectedPlatformCode),
    platforms: PLATFORMS,
    readinessSteps: READINESS_STEPS[selectedPlatformCode],
    resources: buildResources(controlPlane?.student_mode),
    artifacts: controlPlane?.artifacts ?? [],
    selfCheckCommands: unique(controlPlane?.student_mode.self_check_commands ?? []),
    portalCommands: unique(Object.values(controlPlane?.portal_actions ?? {})),
    handoffItems: buildHandoffItems(session),
    nextLesson: controlPlane?.next_lesson
  }
}

const findPlatform = (code: StudentPlatformCode) =>
  PLATFORMS.find(platform => platform.code === code) ?? PLATFORMS[0]

const buildResources = (studentMode?: StudentMode): StudentResource[] => {
  if (!studentMode) {
    return []
  }

  return [
    {
      kind: 'prep',
      label: 'Student prep',
      path: studentMode.prep_runbook,
      description: 'Что установить и проверить до урока.'
    },
    {
      kind: 'workbook',
      label: 'Student workbook',
      path: studentMode.workbook,
      description: 'Практические шаги и вопросы во время занятия.'
    },
    {
      kind: 'homework',
      label: 'Homework',
      path: studentMode.homework,
      description: 'Самостоятельная работа и критерии приемки.'
    }
  ]
}

const buildHandoffItems = (session: AcademySession) =>
  unique([
    ...session.skill_graph.map(skill => skill.evidence),
    ...session.stages.map(stage => stage.student_action)
  ])

const unique = (values: string[]) =>
  Array.from(new Set(values.filter(value => value.trim().length > 0)))
