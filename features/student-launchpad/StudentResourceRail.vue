<script setup lang="ts">
import CopyButton from '~/components/shared/ui/CopyButton.vue'
import Panel from '~/components/shared/ui/Panel.vue'
import type { StudentLaunchpadState } from './student-launchpad-state'

defineProps<{
  state: StudentLaunchpadState
}>()

const isLink = (path: string) => /^https?:\/\//.test(path)
</script>

<template>
  <Panel class="student-resource-rail" eyebrow="materials" title="Материалы ученика">
    <div class="resource-list">
      <article v-for="resource in state.resources" :key="resource.kind" class="resource-item">
        <div>
          <strong>{{ resource.label }}</strong>
          <p>{{ resource.description }}</p>
        </div>
        <div class="resource-copy-row">
          <code>{{ resource.path }}</code>
          <CopyButton :text="resource.path" label="Копировать" />
        </div>
      </article>
    </div>

    <div v-if="state.artifacts.length" class="resource-section">
      <h3>Артефакты</h3>
      <article v-for="artifact in state.artifacts" :key="artifact.path" class="resource-item">
        <div>
          <strong>{{ artifact.label }}</strong>
          <a v-if="isLink(artifact.path)" :href="artifact.path" target="_blank" rel="noreferrer">
            Открыть
          </a>
        </div>
        <div class="resource-copy-row">
          <code>{{ artifact.path }}</code>
          <CopyButton :text="artifact.path" label="Копировать" />
        </div>
      </article>
    </div>

    <div v-if="state.nextLesson" class="resource-section next-lesson">
      <h3>Следующий урок</h3>
      <p>{{ state.nextLesson.title }}</p>
      <code>{{ state.nextLesson.path }}</code>
    </div>
  </Panel>
</template>
