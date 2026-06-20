import { env } from '#config/env';
import { closeDatabase, db } from '#infra/database/client';

import { seedAdminUser } from './admin-user.ts';

const result = await seedAdminUser(db, {
  email: env.ADMIN_SEED_EMAIL,
  password: env.ADMIN_SEED_PASSWORD,
});

if (result === 'skipped') {
  process.stdout.write(
    `Seed admin: usuário ${env.ADMIN_SEED_EMAIL} já existe — nenhuma alteração.\n`,
  );
} else {
  process.stdout.write(`Seed admin: usuário ${env.ADMIN_SEED_EMAIL} criado com role admin.\n`);
}

await closeDatabase();
