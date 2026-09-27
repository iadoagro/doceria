# Estoque da Doceria — Passo a passo

Sistema simples de controle de estoque para celular, com botão para gerar e
enviar pelo WhatsApp uma imagem com os produtos disponíveis.

## Arquivos do projeto

- `index.html`, `style.css`, `app.js` — o sistema em si
- `config.js` — **único arquivo que você precisa editar**
- `manifest.json` — permite "Adicionar à tela inicial"
- `supabase.sql` — script para criar o banco de dados
- `icon.png` (você fornece, 512×512) e `logo.png` (opcional, se quiser logo na imagem)

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **New project**.
3. Escolha um nome, uma senha para o banco (guarde-a) e a região **South America (São Paulo)**.
4. Aguarde alguns minutos até o projeto ficar pronto.

## 2. Rodar o script SQL

1. No painel do Supabase, abra **SQL Editor** (menu lateral).
2. Clique em **New query**.
3. Abra o arquivo `supabase.sql` deste projeto, copie todo o conteúdo e cole no editor.
4. Clique em **Run**. Deve aparecer "Success" — isso cria as tabelas, as regras de
   segurança e as funções que o app usa.

## 3. Preencher o config.js

1. No Supabase, vá em **Settings > API**.
2. Copie o **Project URL** e cole em `SUPABASE_URL` no arquivo `config.js`.
3. Copie a chave **anon public** (não a `service_role`!) e cole em `SUPABASE_ANON_KEY`.
4. Preencha também o nome da doceria, o título e o rodapé da imagem, e a cor
   principal (um código de cor, ex: `#d6336c`).
5. Se quiser logo na imagem, coloque um arquivo `logo.png` na mesma pasta do
   site e mantenha `LOGO_ARQUIVO: "logo.png"`. Se não quiser, deixe `""`.
6. Salve o arquivo.

## 4. Ícone do app

Coloque um arquivo `icon.png` de 512×512 pixels na mesma pasta do site (esse
é o ícone que aparece na tela inicial do celular).

## 5. Publicar de graça com HTTPS

O envio de imagem pelo WhatsApp só funciona em um site com HTTPS (não funciona
abrindo o arquivo direto do computador). Duas opções fáceis e gratuitas:

### Opção A — Netlify (mais simples)
1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arraste a pasta inteira do projeto (com todos os arquivos) para a página.
3. Pronto — o Netlify te dá um link com HTTPS na hora.

### Opção B — GitHub Pages
1. Crie um repositório no GitHub e envie todos os arquivos do projeto.
2. Vá em **Settings > Pages**, escolha a branch principal e salve.
3. Em alguns minutos o site fica disponível em `https://seu-usuario.github.io/seu-repositorio/`.

## 6. Adicionar à tela inicial

**Android (Chrome):** abra o link do site, toque no menu (⋮) e escolha
"Adicionar à tela inicial".

**iPhone (Safari):** abra o link do site, toque no ícone de compartilhar
(quadrado com seta) e escolha "Adicionar à Tela de Início".

Depois disso, o app abre em tela cheia, como um aplicativo normal.

## 7. Usando o dia a dia

- **Vendi**: toque no botão "−" do produto. Dá baixa de 1 unidade na hora.
- **Repor**: toque no botão "+" para somar 1 unidade.
- **Quantidade exata**: toque no número para digitar o valor exato (ex: contagem do dia).
- **Editar/excluir**: toque no nome do produto.
- **Desfazer uma venda**: aparece um aviso por alguns segundos após vender,
  com o botão DESFAZER.
- **Enviar imagem**: toque no botão rosa "📸 Imagem p/ WhatsApp", ajuste as
  opções se quiser e toque em "Enviar pelo WhatsApp".

## 8. Sobre o plano gratuito do Supabase

- O plano gratuito pausa o projeto automaticamente após cerca de **7 dias sem uso**.
  Se isso acontecer, basta entrar no painel do Supabase e clicar em "restaurar"
  o projeto — leva menos de 1 minuto.
- Há um limite generoso de espaço e de operações por mês, mais do que suficiente
  para uma doceria pequena.
- Não é necessário cartão de crédito para o plano gratuito.

---

## Fluxos já revisados

Cadastrar produto, vender, desfazer venda, repor, ajustar quantidade exata,
editar produto, excluir produto, gerar imagem e compartilhar pelo WhatsApp —
todos os fluxos foram revisados no código antes da entrega.
