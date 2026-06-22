<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const { show } = usePlToast();

const email = ref('');
const modalOpen = ref(false);

function showToast() {
  show('Scaffold admin carregado com sucesso.', 'success');
}
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-extrabold tracking-tight text-peach-ink">
      Play+ <span class="text-peach-accent">Admin</span>
    </h1>
    <p class="mt-2 text-sm font-medium text-peach-muted">
      Scaffold inicial — tema Pêssego e componentes base.
    </p>

    <div class="mt-8 space-y-8 rounded-pl-lg bg-peach-surface p-6 shadow-pl-card">
      <div class="space-y-4">
        <h2 class="text-sm font-extrabold uppercase tracking-wide text-peach-muted">
          Geral
        </h2>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full bg-status-pending px-3 py-1 text-xs font-bold text-status-pending-fg">
            Pendente
          </span>
          <span class="rounded-full bg-status-ready px-3 py-1 text-xs font-bold text-status-ready-fg">
            Pronto
          </span>
        </div>

        <PlSkeleton height="3rem" />
        <PlProgressBar :value="47" label="Exemplo de progresso" />
        <PlButton @click="showToast">
          Mostrar toast
        </PlButton>
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-extrabold uppercase tracking-wide text-peach-muted">
          PlAlert
        </h2>
        <PlAlert variant="error">
          Não foi possível enfileirar a transcodificação.
        </PlAlert>
        <PlAlert variant="info">
          O vídeo está na fila de processamento.
        </PlAlert>
        <PlAlert variant="success">
          Upload concluído com sucesso.
        </PlAlert>
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-extrabold uppercase tracking-wide text-peach-muted">
          PlLabel
        </h2>
        <div class="flex flex-col gap-2">
          <PlLabel html-for="demo-title">
            Título do vídeo
          </PlLabel>
          <input
            id="demo-title"
            type="text"
            placeholder="Ex.: Meu filme favorito"
            class="h-[50px] w-full rounded-pl-md border-[1.5px] border-peach-border bg-peach-input px-4 text-[15px] text-peach-ink placeholder:text-peach-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peach-accent"
          >
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-extrabold uppercase tracking-wide text-peach-muted">
          PlInput
        </h2>
        <PlInput
          v-model="email"
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
        />
        <PlInput
          label="Senha"
          type="password"
          error="Senha incorreta. Tente novamente."
          model-value=""
        />
        <PlInput
          label="Campo desabilitado"
          model-value="Somente leitura"
          disabled
        />
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-extrabold uppercase tracking-wide text-peach-muted">
          PlModal
        </h2>
        <PlButton @click="modalOpen = true">
          Abrir modal
        </PlButton>
        <PlModal
          :open="modalOpen"
          title="Confirmar exclusão"
          subtitle="Esta ação não pode ser desfeita."
          @close="modalOpen = false"
        >
          <p class="text-sm font-medium">
            Tem certeza que deseja remover este vídeo do catálogo?
          </p>
          <template #footer>
            <PlButton variant="ghost" @click="modalOpen = false">
              Cancelar
            </PlButton>
            <PlButton variant="danger" @click="modalOpen = false">
              Excluir
            </PlButton>
          </template>
        </PlModal>
      </div>
    </div>
  </section>
</template>
