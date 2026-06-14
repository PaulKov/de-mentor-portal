<script setup lang="ts">
import type { AcademyStage } from '~/core/session/domain/academy-session'

defineProps<{
  stages: AcademyStage[]
  currentStageCode?: string
  framework?: string
  source: string
}>()
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" aria-label="Навигация урока">
      <div class="brand">
        <span class="brand-mark">GP</span>
        <div>
          <strong>Academy Experience v5</strong>
          <small>{{ framework || 'Vue 3 + Nuxt 3 + Vite' }}</small>
        </div>
      </div>

      <nav class="stage-nav" aria-label="Этапы">
        <a
          v-for="stage in stages"
          :key="stage.code"
          class="stage-link"
          :class="{ active: stage.code === currentStageCode }"
          href="#current-stage"
        >
          <span>{{ stage.timebox }}</span>
          {{ stage.title }}
        </a>
      </nav>
    </aside>

    <main>
      <slot />
      <footer>
        <span>Источник состояния: {{ source }}</span>
        <span>{{ framework || 'sample mode' }}</span>
      </footer>
    </main>
  </div>
</template>
