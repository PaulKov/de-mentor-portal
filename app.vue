<script setup lang="ts">
import AcademyPortal from '~/features/academy-portal/AcademyPortal.vue'

const {
  catalog,
  source: catalogSource,
  reload: reloadCatalog,
  isValid: catalogIsValid
} = await useCatalogState()
const {
  session,
  source: sessionSource,
  issues: sessionIssues,
  reload: reloadSession,
  isValid: sessionIsValid
} = await useSessionState()
</script>

<template>
  <AcademyPortal
    :catalog="catalog"
    :catalog-source="catalogSource"
    :catalog-is-valid="catalogIsValid"
    :session="session"
    :session-source="sessionSource"
    :session-issues="sessionIssues"
    :session-is-valid="sessionIsValid"
    @reload-catalog="reloadCatalog"
    @reload-session="reloadSession"
  />
</template>
