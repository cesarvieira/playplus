<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue';

definePageMeta({
  layout: 'default',
});

const config = useRuntimeConfig();
const {
  filter,
  page,
  mergedRows,
  meta,
  totalPages,
  isLoading,
  error,
  refresh,
  isEmpty,
  subtitle,
  transcodeLoadingId,
  enqueueTranscode,
  publicationLoadingId,
  publishVideo,
  scheduleVideo,
  unpublishVideo,
  deleteLoadingId,
  deleteVideo,
  setFilter,
  goToPage,
} = useVideosList();

const scheduleTargetId = ref<string | null>(null);
const deleteTargetId = ref<string | null>(null);

const scheduleTargetVideo = computed(() =>
  mergedRows.value.find(video => video.id === scheduleTargetId.value) ?? null,
);

const deleteTargetVideo = computed(() =>
  mergedRows.value.find(video => video.id === deleteTargetId.value) ?? null,
);

const deleteDialogMessage = computed(() => {
  const title = deleteTargetVideo.value?.title;

  if (!title) {
    return 'Esta ação é irreversível. O vídeo e os arquivos associados serão removidos.';
  }

  return `O vídeo «${title}» e todos os arquivos serão removidos permanentemente.`;
});

function onPublish(videoId: string) {
  void publishVideo(videoId);
}

function onUnpublish(videoId: string) {
  void unpublishVideo(videoId);
}

function onScheduleOpen(videoId: string) {
  scheduleTargetId.value = videoId;
}

function onScheduleClose() {
  scheduleTargetId.value = null;
}

async function onScheduleConfirm(publishedAt: string) {
  if (!scheduleTargetId.value) {
    return;
  }

  await scheduleVideo(scheduleTargetId.value, publishedAt);
  scheduleTargetId.value = null;
}

function onDeleteOpen(videoId: string) {
  deleteTargetId.value = videoId;
}

function onDeleteClose() {
  deleteTargetId.value = null;
}

async function onDeleteConfirm() {
  if (!deleteTargetId.value) {
    return;
  }

  const deleted = await deleteVideo(deleteTargetId.value);

  if (deleted) {
    deleteTargetId.value = null;
  }
}

const showPagination = computed(() => meta.value.total > meta.value.limit);

const emptyTitle = computed(() =>
  filter.value === 'all' ? 'Nenhum vídeo por aqui' : 'Nenhum vídeo neste filtro',
);

const emptyMessage = computed(() =>
  filter.value === 'all'
    ? 'Adicione seu primeiro vídeo para começar o catálogo.'
    : 'Tente outro filtro ou adicione um novo vídeo.',
);
</script>

<template>
  <section class="pl-catalog">
    <div class="pl-catalog-header">
      <div>
        <h1 class="pl-page-title">
          Vídeos da plataforma
        </h1>
        <p
          v-if="!isLoading && !error"
          class="pl-page-lead"
        >
          {{ subtitle }}
        </p>
      </div>
      <div class="pl-catalog-header__actions">
        <FilterPills
          :model-value="filter"
          @update:model-value="setFilter"
        />
        <PlButton to="/videos/new" size="sm">
          <IconPlus class="size-pl-icon-sm" stroke="2.4" aria-hidden="true" />
          Adicionar vídeo
        </PlButton>
      </div>
    </div>

    <LoadingSkeleton v-if="isLoading" />

    <div
      v-else-if="error"
      class="pl-empty-state"
    >
      <h2 class="pl-empty-state__title">
        Não foi possível carregar os vídeos
      </h2>
      <p class="pl-empty-state__message">
        Verifique sua conexão e tente novamente.
      </p>
      <PlButton
        size="sm"
        class="mt-5"
        @click="refresh()"
      >
        Tentar novamente
      </PlButton>
    </div>

    <EmptyState
      v-else-if="isEmpty"
      :title="emptyTitle"
      :message="emptyMessage"
      :show-cta="filter === 'all'"
    />

    <template v-else>
      <VideoTable
        :videos="mergedRows"
        :transcode-loading-id="transcodeLoadingId"
        :publication-loading-id="publicationLoadingId"
        :delete-loading-id="deleteLoadingId"
        :web-url="config.public.webUrl"
        @transcode="enqueueTranscode"
        @publish="onPublish"
        @schedule="onScheduleOpen"
        @unpublish="onUnpublish"
        @delete="onDeleteOpen"
      />

      <SchedulePublicationModal
        :open="scheduleTargetId !== null"
        :loading="publicationLoadingId === scheduleTargetId"
        :video-title="scheduleTargetVideo?.title"
        @close="onScheduleClose"
        @confirm="onScheduleConfirm"
      />

      <ConfirmDialog
        enabled
        :open="deleteTargetId !== null"
        :loading="deleteLoadingId === deleteTargetId"
        :message="deleteDialogMessage"
        @close="onDeleteClose"
        @confirm="onDeleteConfirm"
      />

      <nav
        v-if="showPagination"
        class="pl-pagination"
        aria-label="Paginação do catálogo"
      >
        <PlButton
          variant="secondary"
          size="sm"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        >
          Anterior
        </PlButton>
        <span class="pl-pagination__label">
          Página {{ meta.page }} de {{ totalPages }}
        </span>
        <PlButton
          variant="secondary"
          size="sm"
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
        >
          Próxima
        </PlButton>
      </nav>
    </template>
  </section>
</template>
