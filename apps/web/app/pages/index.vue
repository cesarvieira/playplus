<script setup lang="ts">
import { formatDuration, gradientForVideoId } from '~/utils/format';
import type { VideoListItem } from '~/utils/videos';

const catalog = useCatalogStore();
const page = ref(1);

const selectedVideo = ref<VideoListItem | null>(null);

function selectVideo(video: VideoListItem) {
  selectedVideo.value = video;
}

function closeVideoModal() {
  selectedVideo.value = null;
}

const isTransitioningToPlayer = ref(false);

function playVideo(video: VideoListItem) {
  if (!video) return;
  isTransitioningToPlayer.value = true;
  setTimeout(() => {
    void navigateTo(`/${video.id}?play=true`);
    // Ocultar a div de transição após a troca de rota para que esteja limpa ao retornar
    setTimeout(() => {
      isTransitioningToPlayer.value = false;
    }, 800);
  }, 350); // 350ms de fade-out para preto
}

const subtitle = computed(() =>
  catalog.meta.total === 1 ? '1 vídeo' : `${catalog.meta.total} vídeos`,
);

const totalPages = computed(() =>
  Math.ceil(catalog.meta.total / catalog.meta.limit),
);

const showPagination = computed(() => catalog.meta.total > catalog.meta.limit);

function retry() {
  void catalog.fetchReady(page.value, catalog.meta.limit);
}

onMounted(() => {
  void catalog.fetchReady(page.value);
});

watch(page, (nextPage) => {
  void catalog.fetchReady(nextPage, catalog.meta.limit);
});
</script>

<template>
  <div class="flex flex-col">
    <header class="mb-6">
      <h1 class="text-pl-2xl font-extrabold tracking-pl-tight text-night-text">
        Meus vídeos
      </h1>
      <p
        v-if="catalog.status !== 'loading'"
        class="mt-1 text-pl-sm font-medium text-night-muted"
      >
        {{ subtitle }}
      </p>
    </header>

    <LoadingSkeleton v-if="catalog.status === 'loading'" />
    <EmptyState v-else-if="catalog.status === 'empty'" />
    <div
      v-else-if="catalog.status === 'error'"
      class="flex flex-col items-center gap-6 py-16"
    >
      <PlAlert
        variant="error"
        :dismissible="false"
      >
        {{ catalog.errorMessage ?? 'Não foi possível carregar os vídeos.' }}
      </PlAlert>
      <PlButton
        variant="secondary"
        @click="retry"
      >
        Tentar novamente
      </PlButton>
    </div>
    <template v-else>
      <CatalogGrid
        :videos="catalog.data"
        @select="selectVideo"
      />
      <Pagination
        v-if="showPagination"
        :page="page"
        :total-pages="totalPages"
        class="mt-7"
        @update:page="page = $event"
      />
    </template>

    <PlModal
      :open="selectedVideo !== null"
      title="Detalhes do Vídeo"
      @close="closeVideoModal"
    >
      <div v-if="selectedVideo" class="flex flex-col gap-4">
        <!-- Area simulando o player -->
        <div
          class="relative aspect-video w-full overflow-hidden rounded-pl-lg bg-black border border-night-border-strong flex items-center justify-center cursor-pointer group pl-focus-ring"
          tabindex="0"
          aria-label="Reproduzir vídeo"
          @click="playVideo(selectedVideo)"
          @keydown.enter.prevent="playVideo(selectedVideo)"
          @keydown.space.prevent="playVideo(selectedVideo)"
        >
          <!-- Thumbnail ou gradiente -->
          <img
            v-if="selectedVideo.thumbnail_url"
            :src="selectedVideo.thumbnail_url"
            alt=""
            class="absolute inset-0 size-full object-cover"
          >
          <div
            v-else
            class="absolute inset-0 size-full"
            :class="gradientForVideoId(selectedVideo.id)"
          ></div>

          <!-- Scrim -->
          <div class="absolute inset-0 bg-black/40" aria-hidden="true"></div>

          <!-- Play Button Central -->
          <div
            class="relative flex size-16 items-center justify-center rounded-full bg-cta-gradient text-night-ink shadow-night-card transition-transform duration-200 group-hover:scale-110 active:scale-95"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="translate-x-0.5"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        <!-- Metadata do vídeo -->
        <div class="mt-2">
          <h3 class="text-pl-lg font-extrabold text-night-text leading-tight">
            {{ selectedVideo.title }}
          </h3>
          <p class="mt-1.5 text-pl-sm font-medium text-night-muted">
            Duração: {{ formatDuration(selectedVideo.duration) }}
          </p>
        </div>
      </div>
    </PlModal>

    <!-- Transição de fade para preto (estilo cinema) ao navegar para o player -->
    <Transition name="fade-to-black">
      <div
        v-if="isTransitioningToPlayer"
        class="fixed inset-0 bg-black pointer-events-none"
        style="z-index: 9999;"
      ></div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-to-black-enter-active,
.fade-to-black-leave-active {
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-to-black-enter-from,
.fade-to-black-leave-to {
  opacity: 0;
}
</style>
