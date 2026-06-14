<script setup lang="ts">
import { toRef } from 'vue'
import type { AcademyCatalog } from '~/core/catalog/domain/academy-catalog'
import StatusBadge from '~/components/shared/ui/StatusBadge.vue'
import LessonActionRail from './LessonActionRail.vue'
import LessonList from './LessonList.vue'
import TrackNavigation from './TrackNavigation.vue'
import { useLessonHubState } from './useLessonHubState'

const props = defineProps<{
  catalog: AcademyCatalog
  catalogSource: string
  sessionIsValid: boolean
}>()

const emit = defineEmits<{
  'reload-catalog': []
  'open-session': []
}>()

const catalogRef = toRef(props, 'catalog')
const { hubState, selectLesson, selectRole, selectTrack } = useLessonHubState(catalogRef)
</script>

<template>
  <div class="lesson-hub-shell">
    <TrackNavigation :state="hubState" @select-track="selectTrack" />

    <main class="lesson-hub-main">
      <header class="hub-topbar">
        <div>
          <p class="muted">academy catalog</p>
          <h1>Academy Lesson Hub</h1>
          <p>{{ catalog.tracks.length }} tracks · {{ catalog.generated_at }}</p>
        </div>
        <div class="hub-topbar-actions">
          <div class="hub-catalog-status">
            <StatusBadge tone="success">catalog valid</StatusBadge>
            <span>{{ catalogSource }}</span>
            <button class="quiet-button" type="button" @click="emit('reload-catalog')">
              Обновить каталог
            </button>
          </div>
          <button
            class="quiet-button"
            type="button"
            :disabled="!sessionIsValid"
            @click="emit('open-session')"
          >
            Открыть текущую сессию
          </button>
        </div>
      </header>

      <section class="hub-current-track" aria-label="Выбранное направление">
        <div>
          <p class="muted">selected track</p>
          <h2>{{ hubState.selectedTrack.title }}</h2>
          <p>{{ hubState.selectedTrack.description }}</p>
        </div>
        <StatusBadge :tone="hubState.selectedTrack.status === 'ready' ? 'success' : 'warning'">
          {{ hubState.selectedTrack.status }}
        </StatusBadge>
      </section>

      <div class="lesson-hub-grid">
        <LessonList
          :state="hubState"
          @select-lesson="selectLesson"
        />
        <LessonActionRail
          :state="hubState"
          @select-role="selectRole"
        />
      </div>
    </main>
  </div>
</template>
