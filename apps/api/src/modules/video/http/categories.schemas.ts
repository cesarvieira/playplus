const categoryItemSchema = {
  type: 'object',
  required: ['id', 'name', 'slug'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
  },
} as const;

export const listCategoriesResponseSchema = {
  type: 'object',
  required: ['data', 'meta'],
  additionalProperties: false,
  properties: {
    data: {
      type: 'array',
      items: categoryItemSchema,
    },
    meta: {
      type: 'object',
      required: ['total', 'page', 'limit'],
      additionalProperties: false,
      properties: {
        total: { type: 'integer', minimum: 0 },
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 0 },
      },
    },
  },
} as const;

export const createCategoryBodySchema = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
    },
  },
} as const;

export interface CreateCategoryRequestBody {
  name: string;
}

export const createCategoryResponseSchema = categoryItemSchema;

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
