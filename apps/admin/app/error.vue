<script setup lang="ts">
import type { Component } from 'vue';
import type { NuxtError } from '#app';

import ErrorVisual404 from '~/components/error/ErrorVisual404.vue';
import ErrorVisual500 from '~/components/error/ErrorVisual500.vue';
import ErrorVisualOffline from '~/components/error/ErrorVisualOffline.vue';
import {
  ERROR_PAGE_CONTENT,
  buildErrorDevDetails,
  resolveErrorPageVariant,
  type ErrorPageVariant,
} from '~/utils/error-page';

const ERROR_VISUALS: Record<ErrorPageVariant, Component> = {
  500: ErrorVisual500,
  404: ErrorVisual404,
  offline: ErrorVisualOffline,
};

const props = defineProps<{
  error: NuxtError;
}>();

const route = useRoute();
const isDev = import.meta.dev;

const variant = computed(() => resolveErrorPageVariant(props.error));
const content = computed(() => ERROR_PAGE_CONTENT[variant.value]);
const visual = computed(() => ERROR_VISUALS[variant.value]);
const devDetails = computed(() => buildErrorDevDetails(props.error, route.fullPath));

useHead({
  title: `${content.value.code} — Play+ Admin`,
});

function goHome() {
  clearError({ redirect: '/videos' });
}

function retry() {
  clearError();
}
</script>

<template>
  <ErrorScreen
    :content="content"
    :dev-details="devDetails"
    :show-dev-panel="isDev"
    @home="goHome"
    @retry="retry"
  >
    <template #visual>
      <component :is="visual" />
    </template>
  </ErrorScreen>
</template>
