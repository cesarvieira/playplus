# Worker — operação e resiliência

Guia curto para rodar o worker de transcodificação (`packages/worker`) em desenvolvimento e produção.

## Desenvolvimento

O worker sobe com o monorepo via Turbo:

```bash
pnpm dev
# ou isolado:
pnpm --filter @playplus/worker dev
```

- Processo no **host** (FFmpeg no PATH ou `FFMPEG_PATH` no `.env`)
- Reinício manual ao alterar código (`--watch` no script `dev`)
- Sem Sentry se `SENTRY_DSN` estiver ausente

## Produção (VPS)

### systemd (recomendado hoje)

Exemplo de unit `/etc/systemd/system/playplus-worker.service`:

```ini
[Unit]
Description=Play+ transcode worker
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=playplus
WorkingDirectory=/opt/playplus
EnvironmentFile=/opt/playplus/.env
ExecStart=/usr/bin/pnpm --filter @playplus/worker start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now playplus-worker
sudo systemctl status playplus-worker
```

### Healthcheck / readiness

No boot o worker valida PostgreSQL, Valkey, MinIO e FFmpeg (`ping*` em `src/index.ts`). Se qualquer dependência falhar, o processo encerra com código 1 — adequado para `Restart=on-failure`.

### Sentry

Defina `SENTRY_DSN` no `.env` para capturar:

- Jobs que esgotam todas as tentativas BullMQ
- Jobs stalled (warning)

Falhas intermediárias (retries automáticos) **não** são enviadas ao Sentry.

### Graceful shutdown

`SIGTERM` / `SIGINT` disparam `worker.close()` (BullMQ aguarda o job ativo). Timeout de shutdown: **25 minutos** (abaixo do `lockDuration` de 30 min). Se o worker morrer no meio de um job, a API reconcilia vídeos `processing` stale via `VIDEO_STALE_MINUTES`.

## Docker (futuro)

Esboço para quando o worker entrar no compose de produção:

```yaml
worker:
  build: ./packages/worker
  restart: unless-stopped
  env_file: .env
  depends_on:
    postgres:
      condition: service_healthy
    valkey:
      condition: service_healthy
  # Imagem precisa incluir FFmpeg
```

Não incluído no `docker-compose.yml` de dev — FFmpeg no host mantém o ciclo de desenvolvimento mais rápido.

## BullMQ — stalled jobs

Configuração explícita no worker:

| Opção             | Valor  |
| ----------------- | ------ |
| `lockDuration`    | 30 min |
| `stalledInterval` | 1 min  |
| `maxStalledCount` | 2      |

Jobs stalled voltam à fila; após esgotar stalls, caem em `failed` e o watchdog da API pode marcar o vídeo como `error`.
