<script setup lang="ts">
const catalog = useCatalogStore();
const page = ref(1);

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
      <CatalogGrid :videos="catalog.data" />
      <Pagination
        v-if="showPagination"
        :page="page"
        :total-pages="totalPages"
        class="mt-7"
        @update:page="page = $event"
      />
    </template>
  </div>
</template>
