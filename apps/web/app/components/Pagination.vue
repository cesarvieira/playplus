<script setup lang="ts">
defineOptions({
  name: 'CatalogPagination',
});

const props = defineProps<{
  page: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const pageNumbers = computed(() =>
  Array.from({ length: props.totalPages }, (_, index) => index + 1),
);

function goToPage(nextPage: number) {
  if (nextPage < 1 || nextPage > props.totalPages || nextPage === props.page) {
    return;
  }

  emit('update:page', nextPage);
}
</script>

<template>
  <nav
    class="pl-pagination"
    aria-label="Paginação do catálogo"
  >
    <button
      type="button"
      class="pl-pagination__btn pl-focus-ring"
      :disabled="page <= 1"
      aria-label="Página anterior"
      @click="goToPage(page - 1)"
    >
      ‹
    </button>
    <button
      v-for="pageNumber in pageNumbers"
      :key="pageNumber"
      type="button"
      class="pl-pagination__btn pl-focus-ring"
      :class="{ 'pl-pagination__btn--active': pageNumber === page }"
      :aria-label="`Página ${pageNumber}`"
      :aria-current="pageNumber === page ? 'page' : undefined"
      @click="goToPage(pageNumber)"
    >
      {{ pageNumber }}
    </button>
    <button
      type="button"
      class="pl-pagination__btn pl-focus-ring"
      :disabled="page >= totalPages"
      aria-label="Próxima página"
      @click="goToPage(page + 1)"
    >
      ›
    </button>
  </nav>
</template>
