# Devoluções e Refaturas da Filial

Painel de acompanhamento de devoluções e refaturas: quadro por setor, ficha do caso com histórico e trilha de auditoria, acompanhamento caso a caso, prazo (SLA) por etapa e arquivo de finalizados.

## Estado atual

A interface está completa e roda em dois modos:

- **Modo demonstração** (este repositório, sem backend): os casos ficam no `localStorage` do navegador, sem anexos e sem envio de e-mail. Serve para navegar, testar o fluxo e validar a interface.
- **Modo artefato** (claude.ai): usa o runtime da plataforma (`claude.use`), com banco compartilhado, anexos e envio pelo Outlook.

> A API em Cloudflare (D1 + R2) é a próxima etapa. O esquema já está em `db/schema.sql`.

## Rodar localmente

```bash
npm install
npm run dev
# abra http://localhost:8787
```

Na primeira abertura o painel pede para assumir a administração (só para quem tem permissão de edição); você libera os setores na tela **Acessos** e define os prazos por etapa.

### Ambiente de teste local (sem Cloudflare)

```bash
npm run dev:local
# http://127.0.0.1:8799
```

Sobe um servidor com banco em memória, anexos de verdade e vários usuários ao mesmo tempo — o mesmo painel, sem wrangler.

| Perfil | Endereço |
|---|---|
| Gestor | `/?uid=u-gestor` |
| Key user Logística (Diego) | `/?uid=u-diego` |
| Key user Comercial (Miguel) | `/?uid=u-miguel` |
| Key user Ocorrência (Adilson) | `/?uid=u-adilson` |
| Preenchimento (Ana) | `/?uid=u-ana` |

Gerar massa: `/api/seed?n=100` · limpar casos: `/api/reset`.
Os dados ficam em `dev/.data.json` e os anexos em `dev/.blobs/` (ambos ignorados pelo git).

## Publicar no Cloudflare

1. Crie o repositório e faça o push:

```bash
git init
git add .
git commit -m "painel de devolucoes"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/devolucoes-refaturas.git
git push -u origin main
```

2. No painel da Cloudflare: **Workers & Pages → Create → Connect to Git**, escolha o repositório.
3. Build command: `npm install`. Deploy command: `npx wrangler deploy`.

Ou publique direto da sua máquina:

```bash
npm run deploy
```

O Worker serve o `public/` na mesma origem — não há CORS nem segundo serviço.

## Estrutura

```
public/index.html   interface completa (HTML + CSS + JS, sem build)
src/index.js        Worker que entrega os assets (e receberá a API)
db/schema.sql       esquema D1 da próxima etapa (ainda não usado)
wrangler.toml       configuração do Worker e bindings
```

## Limites do plano gratuito (referência)

| Item | Limite |
|---|---|
| Workers | 100.000 requisições/dia, 10 ms de CPU |
| D1 | 5 milhões de linhas lidas/dia, 100 mil escritas/dia, 500 MB por banco |
| R2 | 10 GB, 1 M operações Classe A, 10 M Classe B |
| Access | 50 usuários |

## Próximos passos

1. API em D1: CRUD dos casos, transições de etapa e trilha (`casos` + `eventos`).
2. Cloudflare Access para login e setor vindo da tabela `acessos`.
3. Anexos em R2 (com compressão de imagem no navegador).
4. E-mail por deeplink do Outlook.