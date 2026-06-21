export const meResponseSchema = {
  type: 'object',
  required: ['id', 'email', 'role', 'created_at'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'viewer'] },
    created_at: { type: 'string', format: 'date-time' },
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
