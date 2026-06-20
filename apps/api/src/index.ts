import './config/env.js';
import './infra/valkey/client.js';
import './infra/database/client.js';

export { db, pingDatabase, closeDatabase } from './infra/database/client.ts';
export { valkey, pingValkey, closeValkey } from './infra/valkey/client.ts';
