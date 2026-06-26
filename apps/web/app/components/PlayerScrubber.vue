<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  currentTime: number;
  duration: number;
}>();

const emit = defineEmits<{
  (e: 'seek', time: number): void;
}>();

const scrubberRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const dragTime = ref(0);

const displayTime = computed(() => {
  return isDragging.value ? dragTime.value : props.currentTime;
});

const progressPercent = computed(() => {
  if (props.duration <= 0) return 0;
  return Math.min(100, Math.max(0, (displayTime.value / props.duration) * 100));
});

function formatTime(totalSeconds: number): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }
  return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

const ariaValueText = computed(() => {
  const currentFormatted = formatTime(displayTime.value);
  const durationFormatted = formatTime(props.duration);
  return `${currentFormatted} de ${durationFormatted}`;
});

function calculateTimeFromEvent(event: PointerEvent): number {
  if (!scrubberRef.value || props.duration <= 0) return 0;
  const rect = scrubberRef.value.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = Math.min(1, Math.max(0, clickX / rect.width));
  return percentage * props.duration;
}

function onPointerDown(event: PointerEvent) {
  // Only handle primary button clicks (left mouse button)
  if (event.button !== 0) return;
  isDragging.value = true;
  scrubberRef.value?.setPointerCapture(event.pointerId);
  dragTime.value = calculateTimeFromEvent(event);
  emit('seek', dragTime.value);
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return;
  dragTime.value = calculateTimeFromEvent(event);
  emit('seek', dragTime.value);
}

function onPointerUp(event: PointerEvent) {
  if (!isDragging.value) return;
  scrubberRef.value?.releasePointerCapture(event.pointerId);
  isDragging.value = false;
  emit('seek', dragTime.value);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    const newTime = Math.min(props.duration, props.currentTime + 10);
    emit('seek', newTime);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    const newTime = Math.max(0, props.currentTime - 10);
    emit('seek', newTime);
  }
}
</script>

<template>
  <div
    ref="scrubberRef"
    role="slider"
    :aria-valuenow="displayTime"
    aria-valuemin="0"
    :aria-valuemax="duration"
    :aria-valuetext="ariaValueText"
    aria-label="Barra de progresso do vídeo"
    tabindex="0"
    class="relative h-3 w-full cursor-pointer flex items-center group outline-hidden"
    data-testid="player-scrubber"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @keydown="onKeyDown"
  >
    <!-- Background Track -->
    <div class="w-full h-1.5 bg-white/20 rounded-full group-hover:h-2 group-focus-within:h-2 transition-all duration-150 relative">
      <!-- Progress Fill -->
      <div
        class="absolute left-0 top-0 h-full rounded-full bg-night-accent"
        :style="{ width: `${progressPercent}%` }"
        data-testid="scrubber-progress-fill"
      ></div>

      <!-- Handle (Thumb) -->
      <div
        class="absolute top-1/2 -translate-y-1/2 size-3.5 rounded-full bg-night-text shadow-md scale-0 group-hover:scale-100 group-focus-within:scale-100 transition-transform duration-150 -ml-1.75"
        :style="{ left: `${progressPercent}%` }"
        data-testid="scrubber-thumb"
      ></div>
    </div>
  </div>
</template>
