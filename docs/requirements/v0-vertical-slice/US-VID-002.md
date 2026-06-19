# US-VID-002 — Upload de arquivo via URL presigned no admin

**Como** Admin/Dono  
**Quero** enviar o arquivo de vídeo diretamente ao storage a partir do painel admin  
**Para** completar o upload sem sobrecarregar a API

**Pilar:** Histórias organizadas  
**Agregado(s):** Video  
**Superfície:** `apps/admin`, `packages/shared`  
**Rastreabilidade:** Business Case v0 — critério de sucesso #1 (upload direto ao MinIO)

## Critérios de Aceite

- [ ] Dado formulário com título e arquivo selecionado, quando submeto upload, então o cliente chama `POST /videos`, obtém `upload_url` e envia o arquivo diretamente ao storage
- [ ] Dado upload em andamento, quando bytes são transferidos, então vejo indicador de progresso percentual (XHR/fetch progress ou equivalente)
- [ ] Dado upload concluído com sucesso, quando o envio termina, então vejo confirmação e opção/botão para disparar transcode (`POST /videos/:id/transcode`)
- [ ] Dado falha no upload (rede ou URL expirada), quando o envio falha, então vejo mensagem de erro e posso tentar novamente sem recriar registro desnecessariamente
- [ ] Dado upload em progresso, quando verifico tráfego da API, então nenhum byte do vídeo passa pelas rotas Fastify

## Requisitos Não-Funcionais

- Performance: barra de progresso atualiza a cada chunk transferido — UI não congela
- Segurança: upload usa apenas `upload_url` presigned retornada pela API autenticada
- Acessibilidade: status de upload anunciável (texto "Enviando… X%" além da barra visual)

## Dependências

- US-USR-002 (login admin)
- US-VID-001 (POST /videos presigned)

## Riscos

- Arquivos muito grandes em dev podem estourar timeout do browser — documentar limite de teste recomendado para v0 (ex.: ≤ 2 GB)
