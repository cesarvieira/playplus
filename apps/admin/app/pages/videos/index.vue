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
  pending,
  error,
  refresh,
  isEmpty,
  subtitle,
  transcodeLoadingId,
  enqueueTranscode,
  setFilter,
  goToPage,
  ready,
} = useVideosList();

await ready;

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
          Meus vídeos
        </h1>
        <p
          v-if="!pending && !error"
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

    <LoadingSkeleton v-if="pending" />

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
        :web-url="config.public.webUrl"
        @transcode="enqueueTranscode"
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
