<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title?: string
}>()
</script>

<template>
  <section class="panel">
    <div v-if="eyebrow || title" class="panel-heading">
      <p v-if="eyebrow" class="muted">{{ eyebrow }}</p>
      <h2 v-if="title">{{ title }}</h2>
    </div>
    <slot />
  </section>
</template>
