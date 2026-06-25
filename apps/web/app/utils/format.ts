export const PLACEHOLDER_GRADIENT_CLASSES = [
  'bg-placeholder-peach',
  'bg-placeholder-green',
  'bg-placeholder-lavender',
  'bg-placeholder-blue',
  'bg-placeholder-neutral',
] as const;

type PlaceholderGradientClass = (typeof PLACEHOLDER_GRADIENT_CLASSES)[number];

function hashString(value: string): number {
  let hash = 5381;

  for (let index = 0; index < value.length; index++) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return Math.abs(hash);
}

export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find(part => part.type === 'day')?.value ?? '';
  const month = (parts.find(part => part.type === 'month')?.value ?? '').replace(/\.$/, '');
  const year = parts.find(part => part.type === 'year')?.value ?? '';

  return `${day} ${month} ${year}`;
}

export function formatDuration(totalSeconds: number | null): string | null {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return null;
  }

  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function gradientForVideoId(id: string): PlaceholderGradientClass {
  const index = hashString(id) % PLACEHOLDER_GRADIENT_CLASSES.length;
  return PLACEHOLDER_GRADIENT_CLASSES[index]!;
}
