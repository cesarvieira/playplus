# US-VID-004 — Worker transcodifica vídeo para HLS

**Como** Admin/Dono  
**Quero** que o worker converta automaticamente o arquivo original em segmentos HLS  
**Para** disponibilizar o vídeo para streaming adaptativo na web

**Pilar:** Aprendizado contínuo  
**Agregado(s):** Video  
**Superfície:** `packages/worker`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — pipeline FFmpeg; `.cursorrules` pipeline de vídeo etapas 4–5

## Critérios de Aceite

- [ ] Dado job BullMQ de transcode na fila, quando o worker processa, então baixa o arquivo original do storage, executa FFmpeg e gera `master.m3u8`, playlists por qualidade e segmentos `.ts`
- [ ] Dado transcode concluído, quando segmentos são gerados, então o worker faz upload de todos os assets HLS para o storage no path do vídeo
- [ ] Dado output HLS, quando inspeciono configuração, então segmentos têm 4 s de duração e rendições incluem 240p, 480p, 720p e 1080p (omitir rendições acima da resolução source)
- [ ] Dado transcode bem-sucedido, quando job finaliza, então vídeo no banco atualiza para `status: ready` com `duration` preenchido e path/URL do `master.m3u8` persistido
- [ ] Dado falha de FFmpeg após retries esgotados, então vídeo atualiza para `status: error` e motivo registrado para emissão via `video.error`
- [ ] Dado worker reiniciado mid-job, quando BullMQ reentrega job, então reprocessamento é idempotente ou falha controlada sem corromper assets parciais

## Requisitos Não-Funcionais

- Performance: transcode de arquivo de teste (720p, ~5 min) completa em ≤ 15 min em VPS dev típica — métrica orientativa, não bloqueante no v0
- Segurança: worker usa credenciais storage server-side; segmentos não exigem credenciais no cliente
- Acessibilidade: n/a (worker)

## Dependências

- US-VID-003 (job enfileirado)
- PLAY-US-001 (FFmpeg no container, MinIO)
- PLAY-US-002 (VideoStatus)

## Riscos

- **Alto esforço técnico** — considerar spike FFmpeg com uma rendição (720p) antes de ladder completo; ladder 240p–1080p permanece meta v0 conforme `docs/stack.md`
- CPU/RAM da VPS limitada — transcode simultâneo de múltiplos vídeos fora de escopo v0 (fila serial aceitável)
