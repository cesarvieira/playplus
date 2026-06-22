<script setup lang="ts">
import { formatPercent } from '~/utils/format';

const props = withDefaults(
  defineProps<{
    value: number;
    label?: string;
    labelClass?: string;
    showValue?: boolean;
    valueText?: string;
  }>(),
  {
    label: undefined,
    showValue: true,
    labelClass: 'text-status-processing-fg',
    valueText: undefined,
  },
);

const labelId = `pl-progress-${useId()}`;

const clampedValue = computed(() => Math.min(100, Math.max(0, props.value)));

const ariaValueText = computed(
  () => props.valueText ?? `${formatPercent(clampedValue.value)} concluído`,
);
</script>

<template>
  <div class="w-full">
    <div v-if="label || $slots.label" class="mb-2 flex items-center justify-between">
      <span :id="labelId" class="text-sm font-bold" :class="labelClass">
        <slot name="label">
          {{ label }}
        </slot>
      </span>
      <span v-if="showValue" class="text-xs font-semibold text-peach-muted" aria-hidden="true">
        {{ formatPercent(value) }}
      </span>
    </div>
    <div
      role="progressbar"
      :aria-labelledby="label ? labelId : undefined"
      :aria-valuenow="value"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuetext="ariaValueText"
      class="h-2.5 overflow-hidden rounded-full bg-peach-border-light"
    >
      <div
        class="h-full rounded-full bg-gradient-to-r from-status-processing-fg/70 to-status-processing-fg transition-[width] duration-300"
        :style="{ width: `${clampedValue}%` }"
      ></div>
    </div>
  </div>
</template>
