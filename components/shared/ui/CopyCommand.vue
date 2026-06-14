<script setup lang="ts">
import { ref } from 'vue'
import { copyTextToClipboard } from '~/shared/utils/clipboard'

const props = defineProps<{
  title: string
  command: string
}>()

const copied = ref(false)
const failed = ref(false)

const copy = async () => {
  try {
    await copyTextToClipboard(props.command)
    copied.value = true
    failed.value = false
    window.setTimeout(() => {
      copied.value = false
    }, 1200)
  } catch {
    failed.value = true
  }
}
</script>

<template>
  <article class="command-card">
    <div>
      <span>{{ title }}</span>
      <code>{{ command }}</code>
    </div>
    <button type="button" @click="copy">
      {{ failed ? 'Не скопировано' : copied ? 'Скопировано' : 'Копировать' }}
    </button>
  </article>
</template>
