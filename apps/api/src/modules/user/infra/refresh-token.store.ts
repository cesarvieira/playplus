import type { Redis } from 'ioredis';

interface RefreshTokenRecord {
  userId: string;
}

function refreshKey(tokenId: string): string {
  return `refresh:${tokenId}`;
}

export class RefreshTokenStore {
  private readonly redis: Redis;
  private readonly ttlSeconds: number;

  constructor(redis: Redis, ttlSeconds: number) {
    this.redis = redis;
    this.ttlSeconds = ttlSeconds;
  }

  async save(tokenId: string, record: RefreshTokenRecord): Promise<void> {
    await this.redis.set(refreshKey(tokenId), JSON.stringify(record), 'EX', this.ttlSeconds);
  }

  async get(tokenId: string): Promise<RefreshTokenRecord | null> {
    const value = await this.redis.get(refreshKey(tokenId));

    if (!value) {
      return null;
    }

    return JSON.parse(value) as RefreshTokenRecord;
  }

  async delete(tokenId: string): Promise<void> {
    await this.redis.del(refreshKey(tokenId));
  }
}
