// Worker do painel: entrega os arquivos de ./public na mesma origem.
// A API em D1 entra aqui na próxima etapa (fetch -> /api/*).
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};