# Iteração 05 — Web UI (catálogo + player)

> **US:** US-USR-003, US-VID-008, US-VID-009  
> **Pré-requisito:** iter-04 + vídeo `ready` no catálogo  
> **Mockup:** `apps/web/mockups/dc.html`  
> **Capacidade:** 8 pts

---

## Tasks técnicas

| Task | Descrição | Est. | Dep. | Superfície |
|------|-----------|------|------|------------|
| **T31** | Scaffold `apps/web` Nuxt 3 + shared + middleware auth | 2 | T01 | web |
| **T32** | Login page + `useAuth` (memória token, refresh cookie) | 3 | T10, T31 | web |
| **T33** | Home catálogo: grid `MediaCard`, `GET /videos?status=ready`, skeleton/empty/error | 3 | T16, T32 | web |
| **T34** | `pages/[id].vue`: fetch metadados, estados unavailable/404/error | 3 | T16, T32 | web |
| **T35** | `VideoPlayer` + `usePlayer`: hls.js, ABR, buffering, poster, no autoplay sound | 5 | T18, T34 | web |
| **T36** | Acessibilidade player: aria-labels, slider scrubber, reduced-motion | 2 | T35 | web |
| **T37** | Teste E2E manual: login web → catálogo → play HLS → estados error | 2 | T35 | — |

### Ordem de execução

```
T31 → T32 → T33
         └→ T34 → T35 → T36 → T37
```

### Pontuação total: 20 pts → dividir 05a (T31–T33) e 05b (T34–T37)

### Riscos

- Safari HLS nativo vs hls.js — detectar em `usePlayer`
- CORS/nginx — validar T18 antes de T35

### Milestone final v0

Primeiro vídeo: **upload admin → transcode → assistir web**.

### DoR

- [x] Mockup player (`dc.html` seção 03)
- [x] US-VID-009 copy e estados definidos
- [ ] Pelo menos 1 vídeo `ready` seed ou upload manual prévio

### Próximo passo

Vertical slice v0 completo → defer US-WS-001 (v0.1) ou polish/Sentry.
