<script setup lang="ts">
import { IconCalendar, IconDotsVertical, IconRocket, IconWorldOff } from '@tabler/icons-vue';

import {
  getPublicationMenuActions,
  resolvePublicationStatus,
} from '~/utils/video-publication';

const props = defineProps<{
  publishedAt: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  publish: [];
  schedule: [];
  unpublish: [];
}>();

const menuId = `video-row-menu-${useId()}`;
const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const defaultTriggerRef = ref<HTMLButtonElement | null>(null);
const customTriggerRef = ref<HTMLElement | null>(null);

const publicationStatus = computed(() => resolvePublicationStatus(props.publishedAt));

const menuActions = computed(() => getPublicationMenuActions(publicationStatus.value));

const hasActions = computed(
  () => menuActions.value.publish || menuActions.value.schedule || menuActions.value.unpublish,
);

function closeMenu() {
  isOpen.value = false;
}

function toggleMenu() {
  if (props.loading) {
    return;
  }

  isOpen.value = !isOpen.value;
}

function onPublish() {
  closeMenu();
  emit('publish');
}

function onSchedule() {
  closeMenu();
  emit('schedule');
}

function onUnpublish() {
  closeMenu();
  emit('unpublish');
}

function isInsideTrigger(target: Node): boolean {
  const trigger = customTriggerRef.value ?? defaultTriggerRef.value;
  return Boolean(trigger?.contains(target));
}

function onDocumentClick(event: MouseEvent) {
  if (!isOpen.value) {
    return;
  }

  const target = event.target as Node;

  if (menuRef.value?.contains(target) || isInsideTrigger(target)) {
    return;
  }

  closeMenu();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    closeMenu();
    (customTriggerRef.value ?? defaultTriggerRef.value)?.focus();
  }
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeydown);
  } else {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onKeydown);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div
    v-if="hasActions"
    ref="menuRef"
    class="pl-video-row-menu-host"
  >
    <slot
      name="trigger"
      :toggle="toggleMenu"
      :is-open="isOpen"
      :disabled="loading"
      :menu-id="menuId"
      :set-trigger-ref="(element: HTMLElement | null) => { customTriggerRef = element; }"
    >
      <button
        ref="defaultTriggerRef"
        type="button"
        class="pl-video-row-menu__trigger pl-focus-ring"
        :aria-expanded="isOpen"
        aria-haspopup="menu"
        :aria-controls="menuId"
        :disabled="loading"
        :aria-label="loading ? 'Ação em andamento' : 'Ações de publicação'"
        @click="toggleMenu"
      >
        <IconDotsVertical
          class="size-pl-icon-sm"
          stroke="2.2"
          aria-hidden="true"
        />
      </button>
    </slot>

    <div
      v-if="isOpen"
      :id="menuId"
      role="menu"
      class="pl-video-row-menu"
      @click.stop
    >
      <button
        v-if="menuActions.publish"
        type="button"
        role="menuitem"
        class="pl-video-row-menu__item"
        @click="onPublish"
      >
        <IconRocket class="size-pl-icon-sm" stroke="2.2" aria-hidden="true" />
        Publicar agora
      </button>
      <button
        v-if="menuActions.schedule"
        type="button"
        role="menuitem"
        class="pl-video-row-menu__item"
        @click="onSchedule"
      >
        <IconCalendar class="size-pl-icon-sm" stroke="2.2" aria-hidden="true" />
        Agendar…
      </button>
      <button
        v-if="menuActions.unpublish"
        type="button"
        role="menuitem"
        class="pl-video-row-menu__item pl-video-row-menu__item--danger"
        @click="onUnpublish"
      >
        <IconWorldOff class="size-pl-icon-sm" stroke="2.2" aria-hidden="true" />
        Despublicar
      </button>
    </div>
  </div>
</template>
