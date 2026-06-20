export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: {
      type: 'string',
      format: 'email',
      minLength: 1,
    },
    password: {
      type: 'string',
      minLength: 8,
    },
  },
} as const;

export const loginResponseSchema = {
  type: 'object',
  required: ['access_token', 'expires_in'],
  additionalProperties: false,
  properties: {
    access_token: { type: 'string' },
    expires_in: { type: 'integer' },
  },
} as const;

export interface LoginRequestBody {
  email: string;
  password: string;
}

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
