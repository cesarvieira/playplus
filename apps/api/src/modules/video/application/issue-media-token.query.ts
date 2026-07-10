import { VideoNotFoundError } from '@playplus/shared';

import type { MediaTokenSigner } from '#infra/media/media-token';

import { isCatalogVisible } from '../domain/video-publication.ts';
import type { VideoRepository } from '../infra/video.repository.ts';
import { mediaPrefixForVideo } from './get-video.query.ts';

/**
 * Reemissão de token de mídia (ADR-007). Alvo do refresh proativo do player:
 * enquanto o vídeo é reproduzível, o `hls.js` renova o token antes de expirar,
 * mantendo o TTL curto sem quebrar vídeos mais longos que o TTL.
 *
 * Aplica a mesma regra de visibilidade do `GET /videos/:id` — só emite token
 * para vídeos visíveis no catálogo (ou qualquer um, para admin). O gate restringe
 * o token ao prefixo `videos/{id}`, então a emissão não amplia o acesso.
 */
export class IssueMediaTokenQuery {
  private readonly videoRepository: VideoRepository;
  private readonly mediaTokenSigner: MediaTokenSigner;

  constructor(videoRepository: VideoRepository, mediaTokenSigner: MediaTokenSigner) {
    this.videoRepository = videoRepository;
    this.mediaTokenSigner = mediaTokenSigner;
  }

  async execute(
    videoId: string,
    options: { includeUnpublished?: boolean } = {},
  ): Promise<{ token: string }> {
    const video = await this.videoRepository.findById(videoId);

    if (!video) {
      throw new VideoNotFoundError();
    }

    if (
      options.includeUnpublished !== true &&
      !isCatalogVisible(video.publishedAt, new Date())
    ) {
      throw new VideoNotFoundError();
    }

    return { token: this.mediaTokenSigner.sign(mediaPrefixForVideo(videoId)) };
  }
}
