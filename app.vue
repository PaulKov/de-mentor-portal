<script setup lang="ts">
import SessionDashboard from '~/features/session-dashboard/SessionDashboard.vue'

const { session, source, issues, reload, isValid } = await useSessionState()
</script>

<template>
  <SessionDashboard
    :session="session"
    :source="source"
    :issues="issues"
    :is-valid="isValid"
    @reload="reload"
  />
</template>
