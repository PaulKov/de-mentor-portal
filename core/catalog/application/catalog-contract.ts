import {
  CATALOG_CONTRACT_VERSION,
  type AcademyCatalog
} from '../domain/academy-catalog.ts'

export interface CatalogValidationIssue {
  path: string
  message: string
}

export interface CatalogValidationResult {
  valid: boolean
  issues: CatalogValidationIssue[]
  catalog?: AcademyCatalog
}

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export class AcademyCatalogContractValidator {
  validate(payload: unknown): CatalogValidationResult {
    const issues: CatalogValidationIssue[] = []

    if (!isRecord(payload)) {
      return {
        valid: false,
        issues: [{ path: '$', message: 'catalog payload should be an object' }]
      }
    }

    this.requireConst(
      payload.contract_version,
      CATALOG_CONTRACT_VERSION,
      'contract_version',
      issues
    )
    this.requireString(payload.generated_at, 'generated_at', issues)
    this.requireString(payload.default_track, 'default_track', issues)
    this.validateTracks(payload, issues)

    return {
      valid: issues.length === 0,
      issues,
      catalog: issues.length === 0 ? payload as AcademyCatalog : undefined
    }
  }

  private validateTracks(payload: UnknownRecord, issues: CatalogValidationIssue[]) {
    if (!Array.isArray(payload.tracks) || payload.tracks.length === 0) {
      issues.push({ path: 'tracks', message: 'tracks should contain at least one track' })
      return
    }

    payload.tracks.forEach((track, index) => {
      this.validateTrack(track, `tracks[${index}]`, issues)
    })

    if (
      typeof payload.default_track === 'string' &&
      !payload.tracks.some(track => isRecord(track) && track.code === payload.default_track)
    ) {
      issues.push({
        path: 'default_track',
        message: 'default_track should reference an existing track'
      })
    }
  }

  private validateTrack(value: unknown, path: string, issues: CatalogValidationIssue[]) {
    if (!isRecord(value)) {
      issues.push({ path, message: `${path} should be an object` })
      return
    }

    for (const field of ['code', 'title', 'description', 'status']) {
      this.requireString(value[field], `${path}.${field}`, issues)
    }

    if (!Array.isArray(value.lessons) || value.lessons.length === 0) {
      issues.push({ path: `${path}.lessons`, message: 'lessons should contain at least one lesson' })
      return
    }

    value.lessons.forEach((lesson, index) => {
      this.validateLesson(lesson, `${path}.lessons[${index}]`, issues)
    })
  }

  private validateLesson(value: unknown, path: string, issues: CatalogValidationIssue[]) {
    if (!isRecord(value)) {
      issues.push({ path, message: `${path} should be an object` })
      return
    }

    for (const field of ['code', 'title', 'summary', 'level', 'duration', 'status']) {
      this.requireString(value[field], `${path}.${field}`, issues)
    }

    this.validateReadiness(value.readiness, `${path}.readiness`, issues)
    this.validateMaterials(value.materials, `${path}.materials`, issues)
    this.validateStringArray(value.mentor_commands, `${path}.mentor_commands`, issues)
    this.validateStringArray(value.student_commands, `${path}.student_commands`, issues)
    this.validateNullableString(value.next_lesson_code, `${path}.next_lesson_code`, issues)

    if (value.launcher !== undefined) {
      this.validateLauncher(value.launcher, `${path}.launcher`, issues)
    }
  }

  private validateReadiness(value: unknown, path: string, issues: CatalogValidationIssue[]) {
    if (!Array.isArray(value)) {
      issues.push({ path, message: `${path} should be an array` })
      return
    }

    value.forEach((item, index) => {
      if (!isRecord(item)) {
        issues.push({ path: `${path}[${index}]`, message: 'readiness item should be an object' })
        return
      }

      for (const field of ['label', 'status', 'detail']) {
        this.requireString(item[field], `${path}[${index}].${field}`, issues)
      }
    })
  }

  private validateMaterials(value: unknown, path: string, issues: CatalogValidationIssue[]) {
    if (!Array.isArray(value)) {
      issues.push({ path, message: `${path} should be an array` })
      return
    }

    value.forEach((item, index) => {
      if (!isRecord(item)) {
        issues.push({ path: `${path}[${index}]`, message: 'material should be an object' })
        return
      }

      for (const field of ['kind', 'label', 'path']) {
        this.requireString(item[field], `${path}[${index}].${field}`, issues)
      }
    })
  }

  private validateLauncher(value: unknown, path: string, issues: CatalogValidationIssue[]) {
    if (!isRecord(value)) {
      issues.push({ path, message: `${path} should be an object` })
      return
    }

    for (const field of ['lab', 'default_route', 'default_platform', 'default_output_dir']) {
      this.requireString(value[field], `${path}.${field}`, issues)
    }

    this.validateLauncherRoutes(value.routes, `${path}.routes`, issues)
    this.validateLauncherPlatforms(value.platforms, `${path}.platforms`, issues)
  }

  private validateLauncherRoutes(
    value: unknown,
    path: string,
    issues: CatalogValidationIssue[]
  ) {
    if (!Array.isArray(value) || value.length === 0) {
      issues.push({ path, message: `${path} should contain at least one route` })
      return
    }

    value.forEach((route, index) => {
      if (!isRecord(route)) {
        issues.push({ path: `${path}[${index}]`, message: 'launcher route should be an object' })
        return
      }

      for (const field of [
        'code',
        'title',
        'description',
        'timebox',
        'session_route',
        'mentor_command',
        'student_command',
        'check_command'
      ]) {
        this.requireString(route[field], `${path}[${index}].${field}`, issues)
      }
    })
  }

  private validateLauncherPlatforms(
    value: unknown,
    path: string,
    issues: CatalogValidationIssue[]
  ) {
    if (!Array.isArray(value) || value.length === 0) {
      issues.push({ path, message: `${path} should contain at least one platform` })
      return
    }

    value.forEach((platform, index) => {
      if (!isRecord(platform)) {
        issues.push({ path: `${path}[${index}]`, message: 'launcher platform should be an object' })
        return
      }

      for (const field of ['code', 'title']) {
        this.requireString(platform[field], `${path}[${index}].${field}`, issues)
      }

      this.validateStringArray(platform.checks, `${path}[${index}].checks`, issues)
      this.validateStringArray(platform.notes, `${path}[${index}].notes`, issues)
    })
  }

  private validateStringArray(value: unknown, path: string, issues: CatalogValidationIssue[]) {
    if (!Array.isArray(value)) {
      issues.push({ path, message: `${path} should be an array` })
      return
    }

    value.forEach((item, index) => {
      this.requireString(item, `${path}[${index}]`, issues)
    })
  }

  private validateNullableString(
    value: unknown,
    path: string,
    issues: CatalogValidationIssue[]
  ) {
    if (value === undefined || value === null) {
      return
    }

    this.requireString(value, path, issues)
  }

  private requireString(value: unknown, path: string, issues: CatalogValidationIssue[]) {
    if (typeof value !== 'string' || value.length === 0) {
      issues.push({ path, message: `${path} should be a non-empty string` })
    }
  }

  private requireConst(
    value: unknown,
    expected: string,
    path: string,
    issues: CatalogValidationIssue[]
  ) {
    if (value !== expected) {
      issues.push({ path, message: `${path} should be ${expected}` })
    }
  }
}
