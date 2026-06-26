<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useVideoDetail } from '~/composables/useVideoDetail';
import { formatDate, formatDuration } from '~/utils/format';

const route = useRoute();

const videoId = computed(() => {
  const id = route.params.id;
  const val = Array.isArray(id) ? id[0] : id;
  return val ?? '';
});

const { video, status, errorMessage, fetchVideo } = useVideoDetail(videoId);

const durationLabel = computed(() => (video.value ? formatDuration(video.value.duration) : null));

const metaLine = computed(() => {
  if (!video.value) return '';
  const date = formatDate(video.value.created_at);
  const duration = durationLabel.value;
  return duration ? `${date} · ${duration}` : date;
});
</script>

<template>
  <div class="flex flex-col max-w-4xl mx-auto w-full">
    <!-- Player Stage (Aspect Ratio Video) to avoid layout shifts -->
    <div
      class="w-full aspect-video rounded-pl-lg overflow-hidden bg-night-card border border-night-border-panel relative"
    >
      <!-- Loading State -->
      <div
        v-if="status === 'loading'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-night-panel"
        aria-hidden="true"
      >
        <span
          class="pl-spinner size-pl-icon-md"
          aria-hidden="true"
        ></span>
        <span class="text-pl-sm font-medium text-night-muted">Carregando vídeo...</span>
      </div>

      <!-- Ready State -->
      <VideoPlayer
        v-else-if="status === 'ready' && video"
        :video="video"
        class="absolute inset-0 w-full h-full"
      />

      <!-- Unavailable Processing State -->
      <PlayerUnavailable
        v-else-if="status === 'unavailable_processing'"
        code="PROCESSING"
        title="Filme no forno."
        message="Este vídeo ainda está sendo preparado."
        class="absolute inset-0 w-full h-full"
        @retry="fetchVideo"
      />

      <!-- Unavailable Queued State -->
      <PlayerUnavailable
        v-else-if="status === 'unavailable_queued'"
        code="QUEUED"
        title="Aguardando a sua vez."
        message="Este vídeo está na fila de processamento."
        class="absolute inset-0 w-full h-full"
        @retry="fetchVideo"
      />

      <!-- Unavailable Error State -->
      <PlayerUnavailable
        v-else-if="status === 'unavailable_error'"
        code="PLAYBACK_ERROR"
        title="A fita embolou."
        message="Este vídeo não está disponível para reprodução."
        class="absolute inset-0 w-full h-full"
        @retry="fetchVideo"
      />

      <!-- Not Found State -->
      <PlayerNotFound
        v-else-if="status === 'not_found'"
        class="absolute inset-0 w-full h-full"
      />

      <!-- Error API State -->
      <div
        v-else-if="status === 'error_api'"
        class="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 bg-night-panel text-center"
      >
        <PlAlert
          variant="error"
          :dismissible="false"
          class="max-w-md"
        >
          {{ errorMessage ?? 'Não foi possível carregar os metadados do vídeo.' }}
        </PlAlert>
        <PlButton
          variant="secondary"
          @click="fetchVideo"
        >
          Tentar novamente
        </PlButton>
      </div>
    </div>

    <!-- Metadata Block -->
    <div class="mt-6">
      <!-- Loading Skeleton -->
      <div
        v-if="status === 'loading'"
        class="flex flex-col gap-2"
      >
        <PlSkeleton
          variant="text"
          width="60%"
          height="2rem"
        />
        <PlSkeleton
          variant="text"
          width="30%"
          height="1.25rem"
        />
      </div>

      <!-- Video Metadata Info -->
      <div v-else-if="video && status !== 'not_found'">
        <h1 class="text-pl-2xl font-extrabold tracking-pl-tight text-night-text">
          {{ video.title }}
        </h1>
        <p class="mt-2 text-pl-sm font-medium text-night-muted">
          {{ metaLine }}
        </p>
      </div>
    </div>
  </div>
</template>
