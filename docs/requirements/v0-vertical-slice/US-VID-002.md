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
- [ ] Dado upload concluído com sucesso, quando o envio termina, então vejo confirmação com botão primário **Iniciar transcodificação** (`POST /videos/:id/transcode`) e ação secundária **Ver na lista** — transcode **não** dispara automaticamente
- [ ] Dado falha de rede com URL ainda válida, quando clico em tentar novamente, então reenvio o arquivo na mesma `upload_url` sem novo `POST /videos`
- [ ] Dado URL presigned expirada, quando clico em tentar novamente, então chamo `POST /videos/:id/upload-url`, obtenho nova URL e reenvio mantendo o mesmo `video_id`
- [ ] Dado upload em progresso, quando verifico tráfego da API, então nenhum byte do vídeo passa pelas rotas Fastify
- [ ] Dado arquivo maior que 2 GB, quando seleciono no formulário, então vejo validação client-side impedindo envio (limite v0)

## Requisitos Não-Funcionais

- Performance: barra de progresso atualiza a cada chunk transferido — UI não congela
- Segurança: upload usa apenas `upload_url` presigned retornada pela API autenticada
- Acessibilidade: barra com `role="progressbar"`, `aria-valuenow`/`aria-valuemax` e texto "Enviando… X%"; região `aria-live="polite"` para transições de estado; dropzone com label e botão "Procurar arquivo" focável por teclado

## Dependências

- US-USR-002 (login admin)
- US-VID-001 (POST /videos presigned, POST /videos/:id/upload-url)

## Riscos

- Arquivos muito grandes em dev podem estourar timeout do browser — limite de teste v0: ≤ 2 GB (validação client-side + copy no formulário)

## Notas de UX (mockup)

- Estados do `UploadForm`: idle → registering → uploading → success | error
- Cancelar envio interrompe a transferência; registro `pending` permanece na listagem
- Modal de envio: aviso `beforeunload` ao sair da aba durante upload ativo
- Pós-upload na listagem: copy **Pronto para transcodificar** (distinto de **Aguardando upload…**)
