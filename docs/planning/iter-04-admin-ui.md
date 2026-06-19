# Iteração 04 — Admin UI

> **US:** US-USR-002, US-VID-002, US-VID-007  
> **Pré-requisito:** iter-03 (pipeline backend E2E)  
> **Mockup:** `apps/admin/mockups/dc.html`  
> **Capacidade:** 8 pts

---

## Tasks técnicas

| Task | Descrição | Est. | Dep. | Superfície |
|------|-----------|------|------|------------|
| **T25** | Scaffold `apps/admin` Nuxt 3 + `@playplus/shared` + env API URL | 2 | T01 | admin |
| **T26** | `useAuth` + store Pinia + middleware auth + página `/login` | 3 | T10, T25 | admin |
| **T27** | `UploadForm` + `useUpload`: metadados → presigned → XHR progress → transcode | 5 | T14, T26 | admin |
| **T28** | `VideoTable` + filtros + estados loading/erro/vazio (US-VID-007) | 3 | T16, T26 | admin |
| **T29** | `useJobs` / WS client: connect `?token=`, handler `video.status`/`video.error`, resync on reconnect | 5 | T23, T28 | admin |
| **T30** | Teste manual persona admin: login → upload → ver progresso → ready | 2 | T29 | — |

### Ordem de execução

```
T25 → T26 → T27
         └→ T28 → T29 → T30
```

### Pontuação total: 20 pts → dividir em 04a (T25–T27, 10pts) e 04b (T28–T30, 10pts)

### DoR

- [x] Mockup UX disponível
- [x] API + WS funcionais
- [x] Critérios US-VID-007 com copy definida

### Próximo passo

[iter-05-web-ui.md](./iter-05-web-ui.md)
