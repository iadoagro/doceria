// ============================================================
// APP — Lista de Produtos da Doceria
// Sem frameworks: HTML + CSS + JavaScript puro.
// ============================================================

// Cliente do Supabase (a biblioteca cria a variável global "supabase")
const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ---------- Estado em memória ----------
let produtos = []; // lista de produtos vinda do banco
let travaSalvar = false; // trava simples contra toque duplo em Salvar/Excluir

// ---------- Referências de elementos ----------
const el = (id) => document.getElementById(id);

const listaProdutos = el("lista-produtos");
const estadoVazio = el("estado-vazio");
const carregando = el("carregando");
const avisoErro = el("aviso-erro");
const indicadorCarregando = el("indicador-carregando");

// ============================================================
// INICIALIZAÇÃO
// ============================================================

function aplicarConfiguracaoVisual() {
  document.documentElement.style.setProperty("--cor-principal", CONFIG.COR_PRINCIPAL);
  document.documentElement.style.setProperty("--cor-principal-clara", corClara(CONFIG.COR_PRINCIPAL));
  const metaTema = document.querySelector('meta[name="theme-color"]');
  if (metaTema) metaTema.setAttribute("content", CONFIG.COR_PRINCIPAL);
  el("nome-doceria").textContent = CONFIG.NOME_DOCERIA;
  document.title = CONFIG.NOME_DOCERIA;
}

// Gera uma versão bem clara da cor principal, para fundos suaves
function corClara(hex) {
  const { r, g, b } = hexParaRgb(hex);
  const misturar = (canal) => Math.round(canal + (255 - canal) * 0.88);
  return `rgb(${misturar(r)}, ${misturar(g)}, ${misturar(b)})`;
}

function hexParaRgb(hex) {
  const limpo = hex.replace("#", "");
  const bigint = parseInt(limpo.length === 3
    ? limpo.split("").map((c) => c + c).join("")
    : limpo, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

async function iniciar() {
  aplicarConfiguracaoVisual();
  configurarEventos();
  await carregarProdutos();
}

document.addEventListener("DOMContentLoaded", iniciar);

// Recarrega os dados sempre que o app volta a aparecer na tela
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") carregarProdutos();
});
window.addEventListener("pageshow", () => carregarProdutos());

// ============================================================
// CARREGAR DADOS
// ============================================================

async function carregarProdutos() {
  try {
    const { data, error } = await db
      .from("produtos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) throw error;

    produtos = data || [];
    renderizarProdutos();
    if (!el("resultado-imagem").classList.contains("oculto")) gerarPreviaImagem();
    esconderErro();
  } catch (erro) {
    console.error(erro);
    mostrarErro("Sem conexão. Não foi possível carregar os produtos. Toque para tentar de novo.");
  } finally {
    carregando.classList.add("oculto");
  }
}

// ============================================================
// RENDERIZAÇÃO — LISTA DE PRODUTOS
// ============================================================

function ordenarProdutos(lista) {
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function renderizarProdutos() {
  // Remove cards antigos, mantendo os elementos fixos (estado vazio / carregando)
  Array.from(listaProdutos.querySelectorAll(".cartao-produto")).forEach((n) => n.remove());

  const ordenados = ordenarProdutos(produtos);
  estadoVazio.classList.toggle("oculto", ordenados.length > 0);

  ordenados.forEach((produto) => {
    listaProdutos.appendChild(criarCardProduto(produto));
  });
}

function criarCardProduto(produto) {
  const card = document.createElement("div");
  card.className = "cartao-produto";
  card.dataset.id = produto.id;

  // Botão com nome + preço (abre edição)
  const botaoInfo = document.createElement("button");
  botaoInfo.type = "button";
  botaoInfo.className = "cartao-produto-info";

  const nomeLinha = document.createElement("p");
  nomeLinha.className = "cartao-produto-nome";
  const nomeSpan = document.createElement("span");
  nomeSpan.textContent = produto.nome;
  nomeLinha.appendChild(nomeSpan);

  const precoLinha = document.createElement("p");
  precoLinha.className = "cartao-produto-preco";
  precoLinha.textContent = produto.preco != null ? formatarMoeda(produto.preco) : "";

  botaoInfo.appendChild(nomeLinha);
  botaoInfo.appendChild(precoLinha);
  botaoInfo.addEventListener("click", () => abrirEdicaoProduto(produto.id));

  card.appendChild(botaoInfo);
  return card;
}

// ============================================================
// NOVO PRODUTO — formulário fixo no topo da tela (sem modal, menos toques)
// ============================================================

el("btn-salvar-novo-produto").addEventListener("click", async () => {
  if (travaSalvar) return;

  const nome = el("input-novo-nome").value.trim();

  if (!nome) {
    mostrarErroCampo("erro-novo-produto", "Digite o nome do produto.");
    return;
  }

  travaSalvar = true;
  mostrarCarregando(true);
  try {
    const { error } = await db.from("produtos").insert({ nome });
    if (error) {
      if (error.code === "23505") {
        mostrarErroCampo("erro-novo-produto", "Já existe um produto com esse nome.");
      } else {
        throw error;
      }
      return;
    }
    el("input-novo-nome").value = "";
    el("input-novo-nome").focus();
    esconderErro();
    await carregarProdutos();
  } catch (erro) {
    console.error(erro);
    mostrarErroCampo("erro-novo-produto", "Sem conexão. O produto NÃO foi salvo, tente de novo.");
  } finally {
    travaSalvar = false;
    mostrarCarregando(false);
  }
});

function converterPreco(texto) {
  if (!texto) return null;
  const normalizado = texto.replace(/\./g, "").replace(",", ".");
  const numero = parseFloat(normalizado);
  if (isNaN(numero) || numero < 0) return null;
  return Math.round(numero * 100) / 100;
}

// ============================================================
// MODAL — EDITAR / EXCLUIR PRODUTO
// ============================================================

function abrirEdicaoProduto(produtoId) {
  const produto = produtos.find((p) => p.id === produtoId);
  if (!produto) return;
  el("input-editar-id").value = produtoId;
  el("input-editar-nome").value = produto.nome;
  el("input-editar-preco").value = produto.preco != null ? String(produto.preco).replace(".", ",") : "";
  esconderErroCampo("erro-editar-produto");
  abrirModal("modal-editar-produto");
}

el("btn-salvar-editar-produto").addEventListener("click", async () => {
  if (travaSalvar) return;

  const produtoId = el("input-editar-id").value;
  const nome = el("input-editar-nome").value.trim();
  const precoBruto = el("input-editar-preco").value.trim();

  if (!nome) {
    mostrarErroCampo("erro-editar-produto", "Digite o nome do produto.");
    return;
  }

  const preco = converterPreco(precoBruto);
  if (precoBruto !== "" && preco === null) {
    mostrarErroCampo("erro-editar-produto", "Digite um preço válido, ex: 3,50.");
    return;
  }

  travaSalvar = true;
  mostrarCarregando(true);
  try {
    const { error } = await db.from("produtos").update({ nome, preco }).eq("id", produtoId);
    if (error) {
      if (error.code === "23505") {
        mostrarErroCampo("erro-editar-produto", "Já existe um produto com esse nome.");
      } else {
        throw error;
      }
      return;
    }
    fecharModal("modal-editar-produto");
    esconderErro();
    await carregarProdutos();
  } catch (erro) {
    console.error(erro);
    mostrarErroCampo("erro-editar-produto", "Sem conexão. As alterações NÃO foram salvas, tente de novo.");
  } finally {
    travaSalvar = false;
    mostrarCarregando(false);
  }
});

el("btn-excluir-produto").addEventListener("click", async () => {
  if (travaSalvar) return;
  const produtoId = el("input-editar-id").value;
  const produto = produtos.find((p) => p.id === produtoId);
  if (!produto) return;

  const confirmado = window.confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`);
  if (!confirmado) return;

  travaSalvar = true;
  mostrarCarregando(true);
  try {
    const { error } = await db.from("produtos").delete().eq("id", produtoId);
    if (error) throw error;
    fecharModal("modal-editar-produto");
    esconderErro();
    await carregarProdutos();
  } catch (erro) {
    console.error(erro);
    mostrarErroCampo("erro-editar-produto", "Sem conexão. A exclusão NÃO foi feita, tente de novo.");
  } finally {
    travaSalvar = false;
    mostrarCarregando(false);
  }
});

// ============================================================
// MODAIS — abrir/fechar genérico
// ============================================================

function abrirModal(id) {
  el(id).classList.remove("oculto");
}

function fecharModal(id) {
  el(id).classList.add("oculto");
}

function configurarEventos() {
  document.querySelectorAll("[data-fechar-modal]").forEach((botao) => {
    botao.addEventListener("click", () => fecharModal(botao.dataset.fecharModal));
  });

  avisoErro.addEventListener("click", () => {
    esconderErro();
    carregarProdutos();
  });

  el("btn-gerar-imagem").addEventListener("click", gerarImagemInline);

  el("btn-compartilhar").addEventListener("click", compartilharImagem);
  el("btn-baixar-imagem").addEventListener("click", baixarImagem);
}

// ============================================================
// ERROS E CARREGAMENTO
// ============================================================

function mostrarErro(mensagem) {
  avisoErro.textContent = mensagem + " (toque para tentar de novo)";
  avisoErro.classList.remove("oculto");
}

function esconderErro() {
  avisoErro.classList.add("oculto");
}

function mostrarErroCampo(id, mensagem) {
  const elErro = el(id);
  elErro.textContent = mensagem;
  elErro.classList.remove("oculto");
}

function esconderErroCampo(id) {
  el(id).classList.add("oculto");
}

function mostrarCarregando(mostrar) {
  indicadorCarregando.classList.toggle("oculto", !mostrar);
}

// ============================================================
// IMAGEM PARA WHATSAPP — seção no fim da mesma página
// ============================================================

let blobImagemAtual = null;

async function gerarImagemInline() {
  el("resultado-imagem").classList.remove("oculto");
  await gerarPreviaImagem();
  el("resultado-imagem").scrollIntoView({ behavior: "smooth", block: "start" });
}

function produtosParaImagem() {
  return [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

async function gerarPreviaImagem() {
  const lista = produtosParaImagem();
  const semProdutos = lista.length === 0;

  el("aviso-sem-produtos").classList.toggle("oculto", !semProdutos);
  document.getElementById("preview-container").classList.toggle("oculto", semProdutos);
  el("btn-baixar-imagem").classList.add("oculto");
  // Desabilita o botão de enviar enquanto a imagem não está pronta, para
  // um toque impaciente não cair no "clicou e não aconteceu nada".
  el("btn-compartilhar").disabled = true;
  blobImagemAtual = null;

  if (semProdutos) return;

  mostrarCarregando(true);
  try {
    // Preços sempre aparecem na imagem; não há mais opções para configurar.
    const opcoes = { mostrarPrecos: true, recado: "" };
    const blob = await desenharImagemCardapio(lista, opcoes);
    if (!blob) throw new Error("Canvas não gerou a imagem (blob vazio)");

    blobImagemAtual = blob;
    const url = URL.createObjectURL(blob);
    const imgEl = el("preview-imagem");
    const antiga = imgEl.src;
    imgEl.src = url;
    if (antiga && antiga.startsWith("blob:")) URL.revokeObjectURL(antiga);

    el("btn-compartilhar").disabled = false;
    if (!podeCompartilharArquivo(blob)) {
      el("btn-baixar-imagem").classList.remove("oculto");
    }
  } catch (erro) {
    console.error(erro);
    mostrarErro("Não foi possível gerar a imagem. Tente novamente.");
  } finally {
    mostrarCarregando(false);
  }
}

function podeCompartilharArquivo(blob) {
  if (!navigator.canShare) return false;
  try {
    const arquivo = new File([blob], "cardapio.png", { type: "image/png" });
    return navigator.canShare({ files: [arquivo] });
  } catch (erro) {
    return false;
  }
}

// Chamado direto no clique, sem processamento assíncrono antes,
// para não ser bloqueado pelo Safari do iPhone.
function compartilharImagem() {
  if (!blobImagemAtual) {
    mostrarErro("A imagem ainda está sendo gerada, aguarde um instante e toque de novo.");
    return;
  }

  const nomeArquivo = nomeArquivoImagem();
  const arquivo = new File([blobImagemAtual], nomeArquivo, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    navigator.share({ files: [arquivo] }).catch((erro) => {
      if (erro && erro.name === "AbortError") return; // a pessoa cancelou o menu de compartilhar
      console.error(erro);
      mostrarErro('Não foi possível abrir o compartilhamento. Toque em "Baixar imagem" e anexe pelo WhatsApp.');
      el("btn-baixar-imagem").classList.remove("oculto");
    });
  } else {
    // Navegador sem suporte a compartilhar arquivos: baixa a imagem direto.
    baixarImagem();
    el("btn-baixar-imagem").classList.remove("oculto");
  }
}

function nomeArquivoImagem() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `cardapio-${ano}-${mes}-${dia}.png`;
}

function baixarImagem() {
  if (!blobImagemAtual) return;
  const url = URL.createObjectURL(blobImagemAtual);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivoImagem();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ============================================================
// DESENHO DA IMAGEM (Canvas API)
// ============================================================

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

async function aguardarFonte() {
  try {
    await document.fonts.load("800 40px Nunito");
    await document.fonts.load("700 32px Nunito");
    await document.fonts.load("600 28px Nunito");
    await document.fonts.ready;
  } catch (erro) {
    console.error("Fonte Nunito não carregou, usando fonte do sistema.", erro);
  }
}

function fonteDisponivel() {
  return document.fonts && Array.from(document.fonts).some((f) => f.family.includes("Nunito"));
}

function nomeFonte() {
  return fonteDisponivel() ? "Nunito" : "-apple-system, Segoe UI, Roboto, sans-serif";
}

function carregarImagemLogo() {
  return new Promise((resolve) => {
    if (!CONFIG.LOGO_ARQUIVO) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = CONFIG.LOGO_ARQUIVO;
  });
}

// Quebra um texto em até `maxLinhas` linhas que cabem em `larguraMax`
function quebrarTexto(ctx, texto, larguraMax, maxLinhas) {
  const palavras = texto.split(" ");
  const linhas = [];
  let linhaAtual = "";

  for (const palavra of palavras) {
    const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width <= larguraMax || !linhaAtual) {
      linhaAtual = tentativa;
    } else {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
      if (linhas.length === maxLinhas - 1) break;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);

  if (linhas.length > maxLinhas) linhas.length = maxLinhas;

  // Se sobrou texto além do que coube, adiciona reticências na última linha
  const textoUsado = linhas.join(" ");
  if (textoUsado.length < texto.length) {
    let ultima = linhas[linhas.length - 1];
    while (ctx.measureText(ultima + "…").width > larguraMax && ultima.length > 1) {
      ultima = ultima.slice(0, -1);
    }
    linhas[linhas.length - 1] = ultima + "…";
  }

  return linhas;
}

function arredondarRetangulo(ctx, x, y, largura, altura, raio) {
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
  ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
  ctx.arcTo(x, y + altura, x, y, raio);
  ctx.arcTo(x, y, x + largura, y, raio);
  ctx.closePath();
}

const EMOJI_DOCE = "🍬";

async function desenharImagemCardapio(listaProdutos, opcoes) {
  await aguardarFonte();
  const logo = await carregarImagemLogo();

  const LARGURA = 1080;
  const MARGEM = 92; // padding lateral generoso, para "respirar"
  const RAIO_CANTO_IMAGEM = 36;
  const GAP_COLUNAS = 48;
  const usarDuasColunas = listaProdutos.length > 12;
  const larguraColuna = usarDuasColunas ? (LARGURA - MARGEM * 2 - GAP_COLUNAS) / 2 : LARGURA - MARGEM * 2;
  const tamanhoFonteNome = listaProdutos.length > 20 ? 36 : 42;
  const padCartaoX = 30;
  const padCartaoTopo = 26;
  const gapEntreCartoes = 18;
  const alturaConteudoCartao = padCartaoTopo * 2 + tamanhoFonteNome * 1.9;
  const alturaLinhaItem = alturaConteudoCartao + gapEntreCartoes;
  const linhasPorColuna = usarDuasColunas
    ? Math.ceil(listaProdutos.length / 2)
    : listaProdutos.length;

  // Blocos do topo (mantidos como constantes para o cálculo da altura bater com o desenho real)
  const TOPO_INICIAL = 96;
  const TAMANHO_LOGO = 220;
  const BLOCO_LOGO = logo ? TAMANHO_LOGO + 30 : 0;
  const BLOCO_NOME = 78;
  const BLOCO_TITULO = 60;
  const BLOCO_DATA = 66;
  const BLOCO_DIVISORIA = 56;
  const alturaTopo = TOPO_INICIAL + BLOCO_LOGO + BLOCO_NOME + BLOCO_TITULO + BLOCO_DATA + BLOCO_DIVISORIA;

  const alturaLista = linhasPorColuna * alturaLinhaItem + 24;
  const alturaRecado = opcoes.recado ? 130 : 0;
  const alturaRodape = 110;
  const ALTURA = Math.max(1400, alturaTopo + alturaLista + alturaRecado + alturaRodape + MARGEM);

  // Desenha tudo num canvas "de trabalho" e só no final recorta os cantos arredondados
  const canvasTrabalho = document.createElement("canvas");
  canvasTrabalho.width = LARGURA;
  canvasTrabalho.height = ALTURA;
  const ctx = canvasTrabalho.getContext("2d");

  const fonte = nomeFonte();
  const corPrincipal = CONFIG.COR_PRINCIPAL;

  // Fundo creme suave com detalhe na cor principal no topo
  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.fillStyle = corClaraCanvas(corPrincipal);
  ctx.fillRect(0, 0, LARGURA, 20);

  let y = TOPO_INICIAL;

  // Logo
  if (logo) {
    const proporcao = logo.width / logo.height;
    const largura = proporcao >= 1 ? TAMANHO_LOGO : TAMANHO_LOGO * proporcao;
    const altura = proporcao >= 1 ? TAMANHO_LOGO / proporcao : TAMANHO_LOGO;
    ctx.save();
    arredondarRetangulo(ctx, LARGURA / 2 - largura / 2, y, largura, altura, 24);
    ctx.clip();
    ctx.drawImage(logo, LARGURA / 2 - largura / 2, y, largura, altura);
    ctx.restore();
    y += BLOCO_LOGO;
  }

  // Nome da doceria, com emoji de doce dos dois lados
  ctx.fillStyle = corPrincipal;
  ctx.font = `800 46px ${fonte}`;
  ctx.textAlign = "center";
  ctx.fillText(`${EMOJI_DOCE} ${CONFIG.NOME_DOCERIA} ${EMOJI_DOCE}`, LARGURA / 2, y + 40);
  y += BLOCO_NOME;

  // Título
  ctx.fillStyle = "#3a2a2a";
  ctx.font = `700 34px ${fonte}`;
  ctx.fillText(CONFIG.TITULO_IMAGEM, LARGURA / 2, y + 34);
  y += BLOCO_TITULO;

  // Data
  const hoje = new Date();
  const diaSemana = DIAS_SEMANA[hoje.getDay()];
  const dataFormatada = `${diaSemana}, ${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  ctx.fillStyle = "#8a7575";
  ctx.font = `600 26px ${fonte}`;
  ctx.fillText(dataFormatada, LARGURA / 2, y + 30);
  y += BLOCO_DATA;

  // Linha decorativa
  ctx.strokeStyle = corClaraCanvas(corPrincipal, 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(LARGURA / 2 - 60, y);
  ctx.lineTo(LARGURA / 2 + 60, y);
  ctx.stroke();
  y += BLOCO_DIVISORIA;

  // Lista de produtos — cada um num cartão arredondado, com respiro generoso
  const inicioLista = y;
  for (let i = 0; i < listaProdutos.length; i++) {
    const produto = listaProdutos[i];
    const coluna = usarDuasColunas ? Math.floor(i / linhasPorColuna) : 0;
    const linhaNaColuna = usarDuasColunas ? i % linhasPorColuna : i;
    const x = MARGEM + coluna * (larguraColuna + GAP_COLUNAS);
    const yCartao = inicioLista + linhaNaColuna * alturaLinhaItem;

    ctx.fillStyle = corClaraCanvas(corPrincipal, 0.94);
    arredondarRetangulo(ctx, x, yCartao, larguraColuna, alturaConteudoCartao, 20);
    ctx.fill();

    const xTexto = x + padCartaoX;
    const larguraColunaInterna = larguraColuna - padCartaoX * 2;
    const yBaseTexto = yCartao + padCartaoTopo;

    ctx.textAlign = "left";
    ctx.fillStyle = "#3a2a2a";
    ctx.font = `700 ${tamanhoFonteNome}px ${fonte}`;

    let larguraDisponivelNome = larguraColunaInterna;
    let textoPreco = "";
    if (opcoes.mostrarPrecos && produto.preco != null) {
      textoPreco = formatarMoeda(produto.preco);
      ctx.font = `700 30px ${fonte}`;
      larguraDisponivelNome -= ctx.measureText(textoPreco).width + 24;
      ctx.font = `700 ${tamanhoFonteNome}px ${fonte}`;
    }

    const linhasNome = quebrarTexto(ctx, produto.nome, larguraDisponivelNome, 2);
    linhasNome.forEach((linha, idx) => {
      ctx.fillText(linha, xTexto, yBaseTexto + tamanhoFonteNome * 0.8 + idx * (tamanhoFonteNome + 4));
    });

    if (textoPreco) {
      ctx.textAlign = "right";
      ctx.fillStyle = corPrincipal;
      ctx.font = `700 30px ${fonte}`;
      ctx.fillText(textoPreco, xTexto + larguraColunaInterna, yBaseTexto + tamanhoFonteNome * 0.8);
    }
  }

  y = inicioLista + linhasPorColuna * alturaLinhaItem + 16;

  // Recado
  if (opcoes.recado) {
    const larguraCaixa = LARGURA - MARGEM * 2;
    ctx.font = `600 28px ${fonte}`;
    const linhasRecado = quebrarTexto(ctx, opcoes.recado, larguraCaixa - 64, 3);
    const alturaCaixa = 48 + linhasRecado.length * 38;

    ctx.fillStyle = corClaraCanvas(corPrincipal, 0.85);
    arredondarRetangulo(ctx, MARGEM, y, larguraCaixa, alturaCaixa, 20);
    ctx.fill();

    ctx.fillStyle = "#5a3d3d";
    ctx.textAlign = "center";
    linhasRecado.forEach((linha, idx) => {
      ctx.fillText(linha, LARGURA / 2, y + 46 + idx * 38);
    });

    y += alturaCaixa + 34;
  }

  // Rodapé
  ctx.fillStyle = "#8a7575";
  ctx.font = `600 24px ${fonte}`;
  ctx.textAlign = "center";
  ctx.fillText(CONFIG.RODAPE_IMAGEM, LARGURA / 2, ALTURA - 46);

  // Recorta os cantos da imagem final, para um acabamento mais bonito
  const canvasFinal = el("canvas-imagem");
  canvasFinal.width = LARGURA;
  canvasFinal.height = ALTURA;
  const ctxFinal = canvasFinal.getContext("2d");
  arredondarRetangulo(ctxFinal, 0, 0, LARGURA, ALTURA, RAIO_CANTO_IMAGEM);
  ctxFinal.clip();
  ctxFinal.drawImage(canvasTrabalho, 0, 0);

  return new Promise((resolve) => {
    canvasFinal.toBlob((blob) => resolve(blob), "image/png");
  });
}

function corClaraCanvas(hex, intensidade = 0.88) {
  const { r, g, b } = hexParaRgb(hex);
  const misturar = (canal) => Math.round(canal + (255 - canal) * intensidade);
  return `rgb(${misturar(r)}, ${misturar(g)}, ${misturar(b)})`;
}
