import { CatalogLoader } from '~/core/catalog/application/catalog-loader'
import type { CatalogValidationIssue } from '~/core/catalog/application/catalog-contract'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import { HttpCatalogSource } from '~/core/catalog/infrastructure/http-catalog-source'

const CATALOG_ENDPOINTS = ['/api/catalog', '/catalog.json', '/catalog.sample.json']

const createCatalogLoader = () =>
  new CatalogLoader(
    CATALOG_ENDPOINTS.map(endpoint => new HttpCatalogSource(endpoint, $fetch))
  )

export async function useCatalogState() {
  const catalog = useState<AcademyCatalog | null>('academy-catalog', () => null)
  const source = useState<string>('academy-catalog-source', () => 'not-loaded')
  const issues = useState<CatalogValidationIssue[]>('academy-catalog-issues', () => [])

  const reload = async () => {
    const result = await createCatalogLoader().load()

    if (result.ok) {
      catalog.value = result.catalog
      source.value = result.source
      issues.value = []
      return
    }

    catalog.value = null
    source.value = result.source
    issues.value = result.issues
  }

  if (!catalog.value && issues.value.length === 0) {
    await reload()
  }

  return {
    catalog,
    source,
    issues,
    reload,
    isValid: computed(() => catalog.value !== null && issues.value.length === 0)
  }
}
