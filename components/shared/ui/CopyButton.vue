<script setup lang="ts">
import { ref } from 'vue'
import { copyTextToClipboard } from '~/shared/utils/clipboard'

const props = defineProps<{
  text: string
  label: string
  copiedLabel?: string
}>()

const copied = ref(false)
const failed = ref(false)

const copy = async () => {
  try {
    await copyTextToClipboard(props.text)
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
  <button class="quiet-button" type="button" @click="copy">
    {{ failed ? 'Не скопировано' : copied ? copiedLabel || 'Скопировано' : label }}
  </button>
</template>
