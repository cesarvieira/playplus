import type { RedisClient } from '#infra/valkey/client';

interface RefreshTokenRecord {
  userId: string;
}

function refreshKey(tokenId: string): string {
  return `refresh:${tokenId}`;
}

export class RefreshTokenStore {
  private readonly redis: RedisClient;
  private readonly ttlSeconds: number;

  constructor(redis: RedisClient, ttlSeconds: number) {
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
