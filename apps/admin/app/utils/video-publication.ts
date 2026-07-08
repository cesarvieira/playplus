import { formatDate } from '~/utils/format';

export type PublicationStatus = 'draft' | 'scheduled' | 'published';

export interface PublicationMenuActions {
  publish: boolean;
  schedule: boolean;
  unpublish: boolean;
}

const SCHEDULE_DATE_ERROR = 'Escolha uma data e hora no futuro.';

export function resolvePublicationStatus(
  publishedAt: string | null,
  now = new Date(),
): PublicationStatus {
  if (publishedAt === null) {
    return 'draft';
  }

  const publishedTime = new Date(publishedAt).getTime();

  if (publishedTime > now.getTime()) {
    return 'scheduled';
  }

  return 'published';
}

export function getPublicationBadgeLabel(
  status: PublicationStatus,
  publishedAt?: string | null,
): string {
  switch (status) {
    case 'draft':
      return 'Rascunho';
    case 'published':
      return 'Publicado';
    case 'scheduled': {
      if (!publishedAt) {
        return 'Agendado';
      }

      const formattedDate = formatDate(publishedAt, 'pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return formattedDate;
    }
    default:
      return status;
  }
}

export function assertScheduleDateIsFuture(isoDate: string, now = new Date()): string | null {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return 'Informe uma data e hora válidas.';
  }

  if (parsed.getTime() <= now.getTime()) {
    return SCHEDULE_DATE_ERROR;
  }

  return null;
}

export function getPublicationMenuActions(status: PublicationStatus): PublicationMenuActions {
  switch (status) {
    case 'draft':
      return { publish: true, schedule: true, unpublish: false };
    case 'published':
      return { publish: false, schedule: true, unpublish: true };
    case 'scheduled':
      return { publish: true, schedule: true, unpublish: true };
    default:
      return { publish: false, schedule: false, unpublish: false };
  }
}

export function toDatetimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}
