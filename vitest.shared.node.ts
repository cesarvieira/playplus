import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // O padrão do vitest são 5s, e isso reprova por CONTENÇÃO, não por defeito:
    // rodando os cinco pacotes ao mesmo tempo (`turbo run test`), um teste de
    // mocks puros levou 6535ms só no `await import` dinâmico e caiu — o mesmo
    // teste passa em 200ms quando o pacote roda sozinho. Teste que só falha
    // quando a máquina está ocupada não mede o código: mede a CPU.
    testTimeout: 15_000,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportOnFailure: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    include: ['src/**/*.{test,spec}.ts'],
  },
});
