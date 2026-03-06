const API_URL = "https://bellamake.onrender.com";
const NUMERO_WHATSAPP = "+558781790842"; // COLOQUE O NÚMERO AQUI

let produtosVitrine = [];
let carrinho = [];
let fretesDisponiveis = [];
let produtoSelecionado = null;
let categoriaAtual = 'Todos';

// Quando a página carrega
window.onload = async () => {
    await carregarProdutos();
    await carregarFretes();
};

async function carregarProdutos() {
    const resp = await fetch(`${API_URL}/produtos`);
    const todos = await resp.json();
    
    // Puxa só os que estão ativos e com estoque
    produtosVitrine = todos.filter(p => p.ativo === true && p.estoque > 0);
    aplicarFiltros();
}

async function carregarFretes() {
    const resp = await fetch(`${API_URL}/fretes`);
    fretesDisponiveis = await resp.json();
}

// ---- LÓGICA DE FILTROS (BARRA DE BUSCA E BOTÕES) ----
function filtrarCategoria(cat) {
    categoriaAtual = cat;
    aplicarFiltros();
}

function filtrarNaTela() {
    aplicarFiltros();
}

function aplicarFiltros() {
    const termo = document.getElementById('searchInput').value.toLowerCase();
    
    const filtrados = produtosVitrine.filter(p => {
        const bateCategoria = categoriaAtual === 'Todos' || p.categoria.toLowerCase() === categoriaAtual.toLowerCase();
        const bateNome = p.nome.toLowerCase().includes(termo);
        return bateCategoria && bateNome;
    });

    renderizarGrid(filtrados);
}

function renderizarGrid(lista) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    
    if(lista.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Nenhum produto encontrado.</p>';
        return;
    }

    lista.forEach(p => {
        // Usando as classes do seu design
        grid.innerHTML += `
            <div class="produto-card" style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1); cursor: pointer;" onclick="abrirProduto('${p._id}')">
                <img src="${p.imagem}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://via.placeholder.com/200'">
                <h3 style="margin: 10px 0 5px;">${p.nome}</h3>
                <p style="color: #d63384; font-size: 20px; font-weight: bold;">R$ ${parseFloat(p.preco).toFixed(2)}</p>
                <button style="background-color: #d63384; color: white; border: none; padding: 8px; width: 100%; border-radius: 5px; cursor: pointer;">Ver Detalhes</button>
            </div>
        `;
    });
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
    abrirModalCarrinho(); 
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

    const resp = await fetch(`${API_URL}/comprar`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ carrinho: carrinho })
    });

    const data = await resp.json();
    
    if (!data.sucesso) {
        return alert("Erro ao finalizar: " + data.mensagem);
    }

    let msg = `🦋 *Novo Pedido - Bella Make* 🦋\n\n`;
    carrinho.forEach(item => {
        msg += `▫️ ${item.quantidade}x ${item.nome}`;
        if (item.cor) msg += ` (Cor: ${item.cor})`;
        msg += ` - R$ ${(item.preco * item.quantidade).toFixed(2)}\n`;
    });
    
    msg += `\n🚚 *Opção:* ${freteNome}\n`;
    msg += `💰 *Total a pagar: R$ ${total}*\n\n`;
    msg += `Aguardando informações para pagamento!`;

    carrinho = [];
    atualizarBadge();
    fecharModal('modal-carrinho');
    carregarProdutos();

    const zapLink = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(zapLink, '_blank');
}