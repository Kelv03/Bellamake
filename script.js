const API_URL = "https://bellamake.onrender.com";
const NUMERO_WHATSAPP = "+558781790842"; // Seu número oficial

let produtosVitrine = [];
let carrinho = [];
let fretesDisponiveis = [];
let produtoSelecionado = null;
let categoriaAtual = 'Todos';

window.onload = async () => {
    await carregarProdutos();
    await carregarFretes();
};

async function carregarProdutos() {
    try {
        const resp = await fetch(`${API_URL}/produtos`);
        const todos = await resp.json();
        
        // BLINDAGEM: Garante que só mostre produtos ativos e com estoque > 0
        produtosVitrine = todos.filter(p => p.ativo === true && parseInt(p.estoque || 0) > 0);
        aplicarFiltros();
    } catch (err) {
        document.getElementById('productGrid').innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: red;">Erro ao carregar a loja. Por favor, atualize a página.</p>';
    }
}

async function carregarFretes() {
    try {
        const resp = await fetch(`${API_URL}/fretes`);
        fretesDisponiveis = await resp.json();
    } catch (err) {
        console.error("Erro ao carregar fretes", err);
    }
}

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
        const bateCategoria = categoriaAtual === 'Todos' || 
                              (categoriaAtual === 'Promoções' && parseFloat(p.preco_promo || 0) > 0) || 
                              (p.categoria && p.categoria.toLowerCase() === categoriaAtual.toLowerCase());
                              
        const bateNome = p.nome.toLowerCase().includes(termo);
        return bateCategoria && bateNome;
    });

    renderizarGrid(filtrados);
}

function renderizarGrid(lista) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    
    if(lista.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #888;">Nenhum produto encontrado nesta categoria.</p>';
        return;
    }

    lista.forEach(p => {
        const preco = parseFloat(p.preco) || 0;
        const promo = parseFloat(p.preco_promo) || 0;
        
        let precoVisual = `<p style="color: #d63384; font-size: 20px; font-weight: bold;">R$ ${preco.toFixed(2)}</p>`;
        
        if (promo > 0) {
            precoVisual = `
                <p style="color: #999; text-decoration: line-through; font-size: 14px; margin-bottom: 0;">R$ ${preco.toFixed(2)}</p>
                <p style="color: #28a745; font-size: 22px; font-weight: bold; margin-top: 2px;">R$ ${promo.toFixed(2)}</p>
            `;
        }

        grid.innerHTML += `
            <div class="produto-card" style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1); cursor: pointer;" onclick="abrirProduto('${p._id}')">
                <img src="${p.imagem}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://via.placeholder.com/200'">
                <h3 style="margin: 10px 0 5px;">${p.nome}</h3>
                ${precoVisual}
                <button style="background-color: #d63384; color: white; border: none; padding: 8px; width: 100%; border-radius: 5px; cursor: pointer; font-weight: bold;">Ver Detalhes</button>
            </div>
        `;
    });
}

function abrirProduto(id) {
    produtoSelecionado = produtosVitrine.find(p => p._id === id);
    
    document.getElementById('detalhe-imagem').src = produtoSelecionado.imagem;
    document.getElementById('detalhe-nome').innerText = produtoSelecionado.nome;
    document.getElementById('detalhe-categoria').innerText = produtoSelecionado.categoria || '';
    document.getElementById('detalhe-estoque').innerText = produtoSelecionado.estoque;
    
    const preco = parseFloat(produtoSelecionado.preco) || 0;
    const promo = parseFloat(produtoSelecionado.preco_promo) || 0;
    
    let precoParaCobrar = preco;
    let precoVisualModal = `<p style="color: #d63384; font-size: 24px; font-weight: bold;">R$ ${preco.toFixed(2)}</p>`;
    
    if (promo > 0) {
        precoParaCobrar = promo;
        precoVisualModal = `
            <span style="color: #999; text-decoration: line-through; font-size: 16px;">R$ ${preco.toFixed(2)}</span><br>
            <span style="color: #28a745; font-size: 28px; font-weight: bold;">R$ ${promo.toFixed(2)}</span>
        `;
    }
    
    document.getElementById('detalhe-preco').innerHTML = precoVisualModal;
    produtoSelecionado.precoFinal = precoParaCobrar; 

    document.getElementById('detalhe-qtd').value = 1;

    const areaCores = document.getElementById('area-cores');
    const selectCor = document.getElementById('detalhe-cor');
    
    if (produtoSelecionado.cores && produtoSelecionado.cores.length > 0) {
        areaCores.style.display = 'block';
        
        const coresDisponiveis = produtoSelecionado.cores.filter(c => parseInt(c.estoque || 0) > 0);
        
        if (coresDisponiveis.length === 0) {
            selectCor.innerHTML = `<option value="">Esgotado em todas as cores</option>`;
            document.getElementById('detalhe-qtd').disabled = true;
        } else {
            selectCor.innerHTML = coresDisponiveis.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
            document.getElementById('detalhe-qtd').disabled = false;
        }
    } else {
        areaCores.style.display = 'none';
        document.getElementById('detalhe-qtd').max = produtoSelecionado.estoque;
        document.getElementById('detalhe-qtd').disabled = false;
    }

    document.getElementById('modal-produto').style.display = 'flex';
}

function fecharModal(idModal) {
    document.getElementById(idModal).style.display = 'none';
}

function adicionarAoCarrinho() {
    const qtd = parseInt(document.getElementById('detalhe-qtd').value);
    let corNome = '';
    let estoqueDisponivel = parseInt(produtoSelecionado.estoque || 0);

    if (produtoSelecionado.cores && produtoSelecionado.cores.length > 0) {
        corNome = document.getElementById('detalhe-cor').value;
        if (!corNome) return alert("Produto esgotado!"); 
        
        const corObj = produtoSelecionado.cores.find(c => c.nome === corNome);
        estoqueDisponivel = parseInt(corObj.estoque || 0);
    }

    if (qtd > estoqueDisponivel || qtd < 1) {
        return alert(`Atenção: Só temos ${estoqueDisponivel} unidades desta opção.`);
    }

    carrinho.push({
        id: produtoSelecionado._id,
        nome: produtoSelecionado.nome,
        preco: parseFloat(produtoSelecionado.precoFinal),
        quantidade: qtd,
        cor: corNome
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
        lista.innerHTML = '<p style="text-align:center; color:#888;">Seu carrinho está vazio.</p>';
    } else {
        carrinho.forEach((item, i) => {
            const descCor = item.cor ? ` | Cor: ${item.cor}` : '';
            lista.innerHTML += `
                <div class="carrinho-item">
                    <div style="flex:1;">
                        <b>${item.nome}</b><span style="font-size:12px; color:#d63384; font-weight:bold;">${descCor}</span><br>
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

async function finalizarCompra() {
    if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
    
    const selectFrete = document.getElementById('select-frete');
    if (selectFrete.value === "") return alert("Por favor, selecione uma opção de entrega ou retirada.");

    const freteNome = selectFrete.options[selectFrete.selectedIndex].text;
    const total = document.getElementById('carrinho-total').innerText;

    const btn = document.querySelector('#modal-carrinho .btn-rosa');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "Processando...";
    btn.disabled = true;

    try {
        const resp = await fetch(`${API_URL}/comprar`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ carrinho: carrinho })
        });

        const data = await resp.json();
        if (!data.sucesso) {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
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

    } catch (err) {
        alert("Erro de conexão. Tente novamente.");
    }

    btn.innerHTML = textoOriginal;
    btn.disabled = false;
}