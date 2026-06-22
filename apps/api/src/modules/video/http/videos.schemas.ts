export const createVideoBodySchema = {
  type: 'object',
  required: ['title', 'file_name', 'file_size'],
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      minLength: 1,
    },
    file_name: {
      type: 'string',
      minLength: 1,
    },
    file_size: {
      type: 'integer',
      minimum: 1,
    },
  },
} as const;

export const createVideoResponseSchema = {
  type: 'object',
  required: ['id', 'upload_url', 'status'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    upload_url: { type: 'string' },
    status: { type: 'string', enum: ['pending'] },
  },
} as const;

export interface CreateVideoRequestBody {
  title: string;
  file_name: string;
  file_size: number;
}

export const videoIdParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

export const renewUploadUrlResponseSchema = {
  type: 'object',
  required: ['id', 'upload_url', 'status'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    upload_url: { type: 'string' },
    status: { type: 'string', enum: ['pending'] },
  },
} as const;

export const enqueueTranscodeResponseSchema = {
  type: 'object',
  required: ['job_id', 'status'],
  additionalProperties: false,
  properties: {
    job_id: { type: 'string' },
    status: { type: 'string', enum: ['queued'] },
  },
} as const;

export const errorResponseSchema = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      additionalProperties: false,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;
