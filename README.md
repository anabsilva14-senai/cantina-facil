# Cantina Fácil

Sistema de pedidos para a cantina da escola: o estudante escolhe pelo celular, recebe uma **senha** e um **código de retirada**, e a atendente acompanha tudo em um painel. O pagamento é feito no balcão.

**Como funciona por dentro**

| Parte | Onde fica | O que usa |
|---|---|---|
| Site (front-end) | pasta `public/` | HTML, CSS e JavaScript puro |
| Servidor (back-end) | pastas `api/` e `lib/` | Node.js na Vercel (função serverless) |
| Banco de dados | `lib/schema.js` e `database/schema.sql` | PostgreSQL no Neon (grátis) |

O site consulta o servidor a cada 4 segundos, por isso o status do pedido muda sozinho na tela, em qualquer celular.

---

## Como colocar no ar (sem experiência, uns 15 minutos)

Você vai usar 3 sites gratuitos: **Neon** (banco), **GitHub** (guarda o código) e **Vercel** (publica o site).

### Passo 1: criar o banco no Neon
1. Entre em **neon.tech** e clique em **Sign up** (pode entrar com o GitHub).
2. Crie um projeto (nome: `cantina-facil`). Pode deixar as opções padrão.
3. Na tela do projeto, clique em **Connect** e copie a **Connection string**. Ela começa com `postgresql://...`. Guarde, vai precisar no passo 3.

Não precisa criar tabelas: o sistema cria sozinho na primeira vez que abrir.

### Passo 2: enviar o código para o GitHub
1. Descompacte este zip no seu computador.
2. Em **github.com**, clique em **New repository**, dê o nome `cantina-facil` e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste **o conteúdo** da pasta descompactada (as pastas `api`, `lib`, `public`, `test`, `database`, `docs` e os arquivos `package.json`, `vercel.json` etc.) para a página. Confira que as pastas continuaram como pastas.
5. Clique em **Commit changes**.

### Passo 3: publicar na Vercel
1. Entre em **vercel.com** e clique em **Sign up > Continue with GitHub**.
2. Clique em **Add New > Project** e escolha o repositório `cantina-facil` (**Import**).
3. Em **Framework Preset**, deixe **Other**. Não mexa em Build nem Output.
4. Abra **Environment Variables** e cadastre três variáveis (nome, depois valor):
   - `DATABASE_URL` = a connection string do Neon (passo 1)
   - `ATTENDANT_PIN` = o PIN que a atendente vai usar (ex.: `4821`)
   - `TOKEN_SECRET` = uma frase longa e aleatória (ex.: `cantina-bolo-de-cenoura-9382-xyz`)
5. Clique em **Deploy** e espere cerca de 1 minuto.
6. A Vercel mostra o endereço do site (algo como `cantina-facil.vercel.app`). **Esse é o link para compartilhar.** Qualquer pessoa abre sem login.

### Passo 4: testar
1. Abra o link no celular, entre como **Estudante** (nome e turma), faça um pedido.
2. Em outro aparelho ou aba, entre como **Atendente** com o PIN, mude para "Em preparo" e "Pronto".
3. No celular do aluno a tela muda sozinha. Para entregar, a atendente digita o **código** que o aluno mostra.
4. Para a TV da cantina, abra o link com `#senhas` no final (ex.: `https://seu-site.vercel.app/#senhas`) ou use o botão no painel.

---

## Se algo der errado

- **"Erro no servidor" ao entrar ou pedir:** quase sempre é a `DATABASE_URL`. Na Vercel, abra **Settings > Environment Variables**, confira se a connection string está inteira, salve e vá em **Deployments > (...) > Redeploy**.
- **Mudou uma variável e nada mudou:** variáveis só valem depois de um novo **Redeploy**.
- **PIN não funciona:** o PIN padrão é `1234` quando `ATTENDANT_PIN` não foi cadastrada.
- **Zerar tudo antes da apresentação:** entre como atendente e clique em **Reiniciar dados** (apaga os pedidos e repõe o estoque inicial).
- **Mudar preços, itens e estoque inicial:** edite a lista `PRODUCTS` em `lib/logic.js` (preço em centavos) e os textos em `public/app.js`. Em um banco que já existe, o preço é alterado direto na tabela `products` (painel SQL do Neon).

## Regras do sistema
- Cada pedido tem **senha** (pública, a atendente chama) e **código de 4 dígitos** (privado, só o aluno vê). A entrega só é confirmada com o código certo.
- Estudante tem **10% de desconto** em tudo. Combos têm preço fechado.
- O pedido fica guardado no aparelho mesmo depois de **Sair**. Se o aluno trocar de aparelho ou limpar o navegador, basta entrar com o **mesmo nome e turma**: o sistema devolve a senha e o código do pedido mais recente das últimas 12 horas.
- Enquanto o pedido não for entregue ou cancelado, o aluno não consegue fazer outro (evita perder o código do primeiro).
- A atendente pode tocar em **Ver código** num pedido "Pronto" (caso o aluno tenha perdido) e pode **cancelar** também pedidos "Prontos" que ninguém retirou. O estoque volta sozinho.
- O aluno pode **alterar ou cancelar** o pedido enquanto estiver em "Recebido". A atendente pode **editar itens e quantidades** (até "Em preparo") e cancelar quando o item acabar. O estoque é ajustado sozinho.
- O estoque **nunca fica negativo**, mesmo com vários pedidos ao mesmo tempo.
- Intervalos configurados: 15:00 às 15:20 e 20:00 às 20:20 (`BREAKS` em `public/app.js`).

## Limites desta versão (bom para citar na apresentação)
- O estudante não tem senha própria: entra só com nome e turma. A segurança do pedido é o código de 4 dígitos. Como o pedido é recuperado por nome e turma, quem souber o nome e a turma de um colega consegue ver o código dele; por isso a atendente deve conferir o nome do aluno no balcão.
- O PIN da atendente é único e não há bloqueio contra muitas tentativas.
- A atualização é por consulta a cada 4 segundos, não em tempo real instantâneo.
- O botão **Demo** simula horários de intervalo para a apresentação.

## Rodar no seu computador (opcional)
Precisa do Node 22+. Sem `DATABASE_URL`, usa um banco SQLite em memória.
```
npm install
npm run dev      # abre em http://localhost:3000
npm test         # roda os testes da API
```