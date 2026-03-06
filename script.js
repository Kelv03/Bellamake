const API_URL = "https://bellamake.onrender.com";
const NUMERO_WHATSAPP = "5500000000000"; // COLOQUE O NÚMERO DELA AQUI!

let produtosVitrine = [];
let carrinho = [];
let fretesDisponiveis = [];
let produtoSelecionado = null;

// Quando a página carrega, busca os produtos e fretes do banco
window.onload = async () => {
    await carregarProdutos();
    await carregarFretes();
};

async function carregarProdutos() {
    const resp = await fetch(`${API_URL}/produtos`);
    const todos = await resp.json();
    
    // Mostra apenas produtos que o Admin deixou ATIVO e que tenham ESTOQUE
    produtosVitrine = todos.filter(p => p.ativo === true && p.estoque > 0);
    
    const vitrine = document.getElementById('vitrine');
    vitrine.innerHTML = '';
    
    if(produtosVitrine.length === 0) {
        vitrine.innerHTML = '<h3 style="width: 100%; text-align: center; color: #888;">Nenhum produto disponível no momento.</h3>';
        return;
    }

    produtosVitrine.forEach(p => {
        vitrine.innerHTML += `
            <div class="produto-card" onclick="abrirProduto('${p._id}')">
                <img src="${p.imagem}" onerror="this.src='https://via.placeholder.com/200'">
                <h3 style="margin: 10px 0 5px;">${p.nome}</h3>
                <p class="preco">R$ ${parseFloat(p.preco).toFixed(2)}</p>
                <button class="btn-rosa" style="margin-top:0;">Ver Detalhes</button>
            </div>
        `;
    });
}

async function carregarFretes() {
    const resp = await fetch(`${API_URL}/fretes`);
    fretesDisponiveis = await resp.json();
}

// ---- LÓGICA DO PRODUTO (MODAL) ----
function abrirProduto(id) {
    produtoSelecionado = produtosVitrine.find(p => p._id === id);
    
    document.getElementById('detalhe-imagem').src = produtoSelecionado.imagem;
    document.getElementById('detalhe-nome').innerText = produtoSelecionado.nome;
    document.getElementById('detalhe-categoria').innerText = produtoSelecionado.categoria;
    document.getElementById('detalhe-preco').innerText = `R$ ${parseFloat(produtoSelecionado.preco).toFixed(2)}`;
    document.getElementById('detalhe-estoque').innerText = produtoSelecionado.estoque;
    document.getElementById('detalhe-qtd').value = 1;
    document.getElementById('detalhe-qtd').max = produtoSelecionado.estoque;

    const areaCores = document.getElementById('area-cores');
    const selectCor = document.getElementById('detalhe-cor');
    
    // Se o produto tiver cores cadastradas pelo admin, mostra a caixa de seleção
    if (produtoSelecionado.cores && produtoSelecionado.cores.length > 0) {
        areaCores.style.display = 'block';
        selectCor.innerHTML = produtoSelecionado.cores.map(c => `<option value="${c}">${c}</option>`).join('');
    } else {
        areaCores.style.display = 'none';
    }

    document.getElementById('modal-produto').style.display = 'flex';
}

function fecharModal(idModal) {
    document.getElementById(idModal).style.display = 'none';
}

// ---- LÓGICA DO CARRINHO ----
function adicionarAoCarrinho() {
    const qtd = parseInt(document.getElementById('detalhe-qtd').value);
    let cor = '';
    
    if (produtoSelecionado.cores && produtoSelecionado.cores.length > 0) {
        cor = document.getElementById('detalhe-cor').value;
    }

    if (qtd > produtoSelecionado.estoque || qtd < 1) {
        alert(`Atenção: Só temos ${produtoSelecionado.estoque} unidades em estoque.`);
        return;
    }

    carrinho.push({
        id: produtoSelecionado._id,
        nome: produtoSelecionado.nome,
        preco: parseFloat(produtoSelecionado.preco),
        quantidade: qtd,
        cor: cor
    });

    atualizarBadge();
    fecharModal('modal-produto');
    alert("Adicionado ao carrinho! 🛒");
}

function atualizarBadge() {
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    document.getElementById('contador-carrinho').innerText = totalItens;
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarBadge();
    abrirModalCarrinho(); // Recarrega a tela do carrinho
}

function abrirModalCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    lista.innerHTML = '';

    if (carrinho.length === 0) {
        lista.innerHTML = '<p style="text-align:center;">Seu carrinho está vazio.</p>';
    } else {
        carrinho.forEach((item, i) => {
            const descCor = item.cor ? ` | Cor: ${item.cor}` : '';
            lista.innerHTML += `
                <div class="carrinho-item">
                    <div style="flex:1;">
                        <b>${item.nome}</b><span style="font-size:12px; color:#666;">${descCor}</span><br>
                        ${item.quantidade}x R$ ${item.preco.toFixed(2)}
                    </div>
                    <button class="btn-remover" onclick="removerDoCarrinho(${i})"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
    }

    // Popula a lista de cidades e fretes
    const selectFrete = document.getElementById('select-frete');
    selectFrete.innerHTML = '<option value="">Selecione uma opção...</option>';
    fretesDisponiveis.forEach(f => {
        selectFrete.innerHTML += `<option value="${f.valor}">${f.cidade} - R$ ${parseFloat(f.valor).toFixed(2)}</option>`;
    });

    calcularTotal();
    document.getElementById('modal-carrinho').style.display = 'flex';
}

function calcularTotal() {
    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const frete = parseFloat(document.getElementById('select-frete').value || 0);
    
    document.getElementById('carrinho-subtotal').innerText = subtotal.toFixed(2);
    document.getElementById('carrinho-total').innerText = (subtotal + frete).toFixed(2);
}

// ---- FINALIZAR COMPRA E BAIXA DE ESTOQUE ----
async function finalizarCompra() {
    if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
    
    const selectFrete = document.getElementById('select-frete');
    if (selectFrete.value === "") return alert("Por favor, selecione uma opção de entrega ou retirada.");

    const freteValor = parseFloat(selectFrete.value);
    const freteNome = selectFrete.options[selectFrete.selectedIndex].text;
    const total = document.getElementById('carrinho-total').innerText;

    // 1. Manda a lista para o Backend (Python) para dar baixa no estoque
    const resp = await fetch(`${API_URL}/comprar`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ carrinho: carrinho })
    });

    const data = await resp.json();
    
    if (!data.sucesso) {
        return alert("Erro ao finalizar: " + data.mensagem);
    }

    // 2. Monta o texto para o WhatsApp
    let msg = `🦋 *Novo Pedido - Gaby Makes* 🦋\n\n`;
    carrinho.forEach(item => {
        msg += `▫️ ${item.quantidade}x ${item.nome}`;
        if (item.cor) msg += ` (Cor: ${item.cor})`;
        msg += ` - R$ ${(item.preco * item.quantidade).toFixed(2)}\n`;
    });
    
    msg += `\n🚚 *Opção:* ${freteNome}\n`;
    msg += `💰 *Total a pagar: R$ ${total}*\n\n`;
    msg += `Aguardando informações para pagamento!`;

    // 3. Esvazia o carrinho e abre o WhatsApp da Gaby
    carrinho = [];
    atualizarBadge();
    fecharModal('modal-carrinho');
    carregarProdutos(); // Recarrega a vitrine para esconder produtos que ficaram sem estoque

    const zapLink = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(zapLink, '_blank');
}