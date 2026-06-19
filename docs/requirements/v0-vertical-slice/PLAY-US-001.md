# PLAY-US-001 — Ambiente de desenvolvimento local

**Como** Admin/Dono (desenvolvedor)  
**Quero** subir postgres, valkey, minio, api e worker com um único comando  
**Para** desenvolver e testar o pipeline de vídeo sem depender de R2 ou CDN em produção

**Pilar:** Aprendizado contínuo  
**Agregado(s):** — (infra cross-cutting)  
**Superfície:** Docker Compose, `apps/api`, `packages/worker`  
**Rastreabilidade:** Business Case v0 — critério de sucesso #5 (ambiente local)

## Critérios de Aceite

- [ ] Dado um clone limpo do repositório, quando executo `docker compose up` com `.env` configurado, então os serviços `postgres`, `valkey`, `minio`, `api` e `worker` ficam healthy
- [ ] Dado o MinIO rodando, quando a API inicia, então o bucket configurado existe ou é criado automaticamente
- [ ] Dado variáveis `STORAGE_*` apontando para MinIO local, quando api e worker acessam storage, então ambos usam a mesma API S3-compatible sem código específico de ambiente
- [ ] Dado o worker com FFmpeg instalado na imagem, quando um job de transcode é enfileirado, então o container consegue executar `ffmpeg` sem erro de binário ausente

## Requisitos Não-Funcionais

- Performance: serviços devem subir em ≤ 2 minutos em máquina de dev típica (8 GB RAM)
- Segurança: credenciais MinIO e postgres apenas em `.env` — nunca commitadas
- Acessibilidade: n/a (infra)

## Dependências

- Nenhuma (primeira US da ordem sugerida)

## Riscos

- VPS local com pouca RAM pode falhar em transcode + múltiplos containers — mitigar limitando resoluções de teste no spike inicial
