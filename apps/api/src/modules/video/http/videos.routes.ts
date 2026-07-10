import type { FastifyInstance } from 'fastify';

import { USER_ROLE } from '@playplus/shared';

import { env } from '#config/env';
import { db } from '#infra/database/client';
import { createMediaTokenSigner } from '#infra/media/media-token.factory';
import { createStorageClient } from '#infra/storage/storage.factory';
import { createAuthMiddleware } from '#modules/user/http/create-auth.middleware';
import { requireRole } from '#modules/user/http/require-role.middleware';

import { CreateVideoUseCase } from '../application/create-video.use-case.ts';
import { EnqueueTranscodeUseCase } from '../application/enqueue-transcode.use-case.ts';
import { GetVideoQuery } from '../application/get-video.query.ts';
import { IssueMediaTokenQuery } from '../application/issue-media-token.query.ts';
import { ListVideosQuery } from '../application/list-videos.query.ts';
import { PublishVideoUseCase } from '../application/publish-video.use-case.ts';
import { RenewUploadUrlUseCase } from '../application/renew-upload-url.use-case.ts';
import { ScheduleVideoUseCase } from '../application/schedule-video.use-case.ts';
import { UnpublishVideoUseCase } from '../application/unpublish-video.use-case.ts';
import { createTranscodeQueue } from '../infra/transcode.queue.ts';
import { VideoRepository } from '../infra/video.repository.ts';
import {
  createVideoBodySchema,
  createVideoResponseSchema,
  enqueueTranscodeResponseSchema,
  errorResponseSchema,
  getVideoQuerySchema,
  getVideoResponseSchema,
  listVideosQuerySchema,
  mediaTokenResponseSchema,
  listVideosResponseSchema,
  type GetVideoQuerystring,
  type ListVideosQuerystring,
  publishVideoResponseSchema,
  renewUploadUrlResponseSchema,
  scheduleVideoBodySchema,
  type CreateVideoRequestBody,
  type ScheduleVideoRequestBody,
  videoIdParamsSchema,
} from './videos.schemas.ts';

function resolveIncludeUnpublished(
  role: string,
  includeUnpublished?: boolean,
): boolean {
  return role === USER_ROLE.ADMIN && includeUnpublished === true;
}

export default async function videosRoutes(fastify: FastifyInstance): Promise<void> {
  const authenticate = createAuthMiddleware();
  const videoRepository = new VideoRepository(db);
  const storageClient = createStorageClient();
  const mediaTokenSigner = createMediaTokenSigner();
  const transcodeQueue = createTranscodeQueue();
  const createVideoUseCase = new CreateVideoUseCase(videoRepository, storageClient);
  const renewUploadUrlUseCase = new RenewUploadUrlUseCase(videoRepository, storageClient);
  const enqueueTranscodeUseCase = new EnqueueTranscodeUseCase(
    videoRepository,
    storageClient,
    transcodeQueue,
  );
  const listVideosQuery = new ListVideosQuery(
    videoRepository,
    storageClient,
    env.CDN_BASE_URL,
    mediaTokenSigner,
  );
  const getVideoQuery = new GetVideoQuery(
    videoRepository,
    storageClient,
    env.CDN_BASE_URL,
    mediaTokenSigner,
  );
  const issueMediaTokenQuery = new IssueMediaTokenQuery(videoRepository, mediaTokenSigner);
  const publishVideoUseCase = new PublishVideoUseCase(videoRepository);
  const scheduleVideoUseCase = new ScheduleVideoUseCase(videoRepository);
  const unpublishVideoUseCase = new UnpublishVideoUseCase(videoRepository);

  fastify.get(
    '/videos',
    {
      schema: {
        querystring: listVideosQuerySchema,
        response: {
          200: listVideosResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('viewer')],
    },
    async (request, reply) => {
      const query = request.query as ListVideosQuerystring;
      const includeUnpublished = resolveIncludeUnpublished(
        request.user.role,
        query.include_unpublished,
      );
      const result = await listVideosQuery.execute({
        page: query.page,
        limit: query.limit,
        status: query.status,
        includeUnpublished,
      });

      return reply.status(200).send({
        data: result.data.map(item => ({
          id: item.id,
          title: item.title,
          duration: item.duration,
          thumbnail_url: item.thumbnailUrl,
          status: item.status,
          ...(item.uploadComplete !== undefined ? { upload_complete: item.uploadComplete } : {}),
          ...(item.errorReason !== undefined ? { error_reason: item.errorReason } : {}),
          published_at: item.publishedAt,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        })),
        meta: result.meta,
      });
    },
  );

  fastify.get(
    '/videos/:id',
    {
      schema: {
        params: videoIdParamsSchema,
        querystring: getVideoQuerySchema,
        response: {
          200: getVideoResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('viewer')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = request.query as GetVideoQuerystring;
      const includeUnpublished = resolveIncludeUnpublished(
        request.user.role,
        query.include_unpublished,
      );
      const result = await getVideoQuery.execute(id, { includeUnpublished });

      return reply.status(200).send({
        id: result.id,
        title: result.title,
        duration: result.duration,
        thumbnail_url: result.thumbnailUrl,
        ...(result.streamUrl !== undefined ? { stream_url: result.streamUrl } : {}),
        status: result.status,
        ...(result.uploadComplete !== undefined ? { upload_complete: result.uploadComplete } : {}),
        ...(result.errorReason !== undefined ? { error_reason: result.errorReason } : {}),
        progress: result.progress,
        published_at: result.publishedAt,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
      });
    },
  );

  fastify.get(
    '/videos/:id/media-token',
    {
      schema: {
        params: videoIdParamsSchema,
        querystring: getVideoQuerySchema,
        response: {
          200: mediaTokenResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('viewer')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = request.query as GetVideoQuerystring;
      const includeUnpublished = resolveIncludeUnpublished(
        request.user.role,
        query.include_unpublished,
      );
      const result = await issueMediaTokenQuery.execute(id, { includeUnpublished });

      return reply.status(200).send({
        token: result.token,
        expires_in: env.MEDIA_TOKEN_TTL_SECONDS,
      });
    },
  );

  fastify.post(
    '/videos',
    {
      schema: {
        body: createVideoBodySchema,
        response: {
          201: createVideoResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const body = request.body as CreateVideoRequestBody;
      const result = await createVideoUseCase.execute({
        title: body.title,
        fileName: body.file_name,
        fileSize: body.file_size,
      });

      return reply.status(201).send({
        id: result.id,
        upload_url: result.uploadUrl,
        status: result.status,
      });
    },
  );

  fastify.post(
    '/videos/:id/upload-url',
    {
      schema: {
        params: videoIdParamsSchema,
        response: {
          200: renewUploadUrlResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await renewUploadUrlUseCase.execute(id);

      return reply.status(200).send({
        id: result.id,
        upload_url: result.uploadUrl,
        status: result.status,
      });
    },
  );

  fastify.post(
    '/videos/:id/transcode',
    {
      schema: {
        params: videoIdParamsSchema,
        response: {
          202: enqueueTranscodeResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await enqueueTranscodeUseCase.execute(id);

      return reply.status(202).send({
        job_id: result.jobId,
        status: result.status,
      });
    },
  );

  fastify.patch(
    '/videos/:id/publish',
    {
      schema: {
        params: videoIdParamsSchema,
        response: {
          200: publishVideoResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await publishVideoUseCase.execute(id);

      return reply.status(200).send({
        id: result.id,
        published_at: result.publishedAt,
      });
    },
  );

  fastify.patch(
    '/videos/:id/schedule',
    {
      schema: {
        params: videoIdParamsSchema,
        body: scheduleVideoBodySchema,
        response: {
          200: publishVideoResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as ScheduleVideoRequestBody;
      const result = await scheduleVideoUseCase.execute(id, new Date(body.published_at));

      return reply.status(200).send({
        id: result.id,
        published_at: result.publishedAt,
      });
    },
  );

  fastify.patch(
    '/videos/:id/unpublish',
    {
      schema: {
        params: videoIdParamsSchema,
        response: {
          200: publishVideoResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [authenticate, requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await unpublishVideoUseCase.execute(id);

      return reply.status(200).send({
        id: result.id,
        published_at: result.publishedAt,
      });
    },
  );
}
