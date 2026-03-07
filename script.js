const API_URL = "https://bellamake.onrender.com";
const NUMERO_WHATSAPP = "558781790842"; // Seu número oficial

let produtosVitrine = [];
let carrinho = [];
let fretesDisponiveis = [];
let produtoSelecionado = null;
let categoriaAtual = 'Todos';

// --- INICIALIZAÇÃO DA LOJA ---
window.onload = async () => {
    carregarCarrinhoLocal(); // 1. Puxa a memória do F5
    await carregarProdutos();
    await carregarFretes();
    
    const telaLoading = document.getElementById('tela-loading');
    if(telaLoading) {
        setTimeout(() => { telaLoading.classList.add('escondido'); }, 1200);
    }
};

// --- MEMÓRIA DO CARRINHO (SALVA NO NAVEGADOR) ---
function salvarCarrinhoLocal() {
    localStorage.setItem('bellaMake_carrinho', JSON.stringify(carrinho));
}

function carregarCarrinhoLocal() {
    const salvo = localStorage.getItem('bellaMake_carrinho');
    if (salvo) {
        carrinho = JSON.parse(salvo);
        atualizarCarrinhoDOM();
    }
}

// --- BUSCANDO DADOS DO SERVIDOR ---
async function carregarProdutos() {
    try {
        const resp = await fetch(`${API_URL}/produtos`);
        const todos = await resp.json();
        produtosVitrine = todos.filter(p => p.ativo === true && parseInt(p.estoque || 0) > 0);
        aplicarFiltros();
    } catch (err) {
        const grid = document.getElementById('productGrid');
        if(grid) grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: red;">Erro ao carregar a loja. Por favor, atualize a página.</p>';
    }
}

async function carregarFretes() {
    try {
        const resp = await fetch(`${API_URL}/fretes`);
        fretesDisponiveis = await resp.json();
        
        const selectFrete = document.getElementById('select-frete-seguro');
        if(selectFrete) {
            selectFrete.innerHTML = '<option value="">Selecione a entrega/retirada...</option>';
            fretesDisponiveis.forEach(f => {
                selectFrete.innerHTML += `<option value="${f.valor}">${f.cidade} - R$ ${parseFloat(f.valor).toFixed(2)}</option>`;
            });
        }
    } catch (err) {}
}

// --- FILTROS E CATEGORIAS ---
function acaoMenu(cat, botaoClicado = null) {
    fecharMenuLateral(); 
    categoriaAtual = cat;
    
    if(botaoClicado) {
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        botaoClicado.classList.add('active');
    }
    aplicarFiltros();
}

function filtrarNaTela() { aplicarFiltros(); }

function aplicarFiltros() {
    const inputBusca = document.getElementById('searchInput');
    const termo = inputBusca ? inputBusca.value.toLowerCase() : '';
    
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
    if(!grid) return;
    grid.innerHTML = '';
    
    if(lista.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #888;">Nenhum produto encontrado.</p>';
        return;
    }

    lista.forEach(p => {
        const preco = parseFloat(p.preco) || 0;
        const promo = parseFloat(p.preco_promo) || 0;
        
        let precoVisual = `<p class="preco">R$ ${preco.toFixed(2)}</p>`;
        
        if (promo > 0) {
            precoVisual = `
                <p style="color: #999; text-decoration: line-through; font-size: 13px; margin-bottom: 0;">R$ ${preco.toFixed(2)}</p>
                <p class="preco" style="margin-top: 2px;">R$ ${promo.toFixed(2)}</p>
            `;
        }

        grid.innerHTML += `
            <div class="produto-card" style="cursor: pointer;" onclick="abrirDetalhe('${p._id}')">
                <img src="${p.imagem}" onerror="this.src='https://via.placeholder.com/200'">
                <h3>${p.nome}</h3>
                ${precoVisual}
                <button class="btn-rosa" style="padding: 8px; font-size: 14px;">Ver Detalhes</button>
            </div>
        `;
    });
}

// --- DETALHES DO PRODUTO (MODAL) ---
function abrirDetalhe(id) {
    produtoSelecionado = produtosVitrine.find(p => p._id === id);
    if(!produtoSelecionado) return;
    
    document.getElementById('detalhe-imagem').src = produtoSelecionado.imagem;
    document.getElementById('detalhe-nome').innerText = produtoSelecionado.nome;
    document.getElementById('detalhe-estoque').innerText = produtoSelecionado.estoque;
    
    const preco = parseFloat(produtoSelecionado.preco) || 0;
    const promo = parseFloat(produtoSelecionado.preco_promo) || 0;
    let precoParaCobrar = promo > 0 ? promo : preco;
    
    let precoVisualModal = `<p style="color: #d63384; font-size: 24px; font-weight: bold; margin:0;">R$ ${preco.toFixed(2)}</p>`;
    
    if (promo > 0) {
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
    const modal = document.getElementById(idModal);
    if(modal) modal.style.display = 'none';
}

// --- CARRINHO DE COMPRAS E MENUS ---
function abrirMenuLateral() {
    const fundo = document.getElementById('menu-fundo');
    const menu = document.getElementById('menu-navegacao');
    if(fundo && menu) {
        fundo.style.display = 'block';
        setTimeout(() => { menu.classList.add('aberto'); }, 10);
    }
}

function fecharMenuLateral() {
    const fundo = document.getElementById('menu-fundo');
    const menu = document.getElementById('menu-navegacao');
    if(fundo && menu) {
        menu.classList.remove('aberto');
        setTimeout(() => { fundo.style.display = 'none'; }, 400);
    }
}

function abrirModalCarrinho() {
    const fundo = document.getElementById('carrinho-fundo');
    const menu = document.getElementById('carrinho-menu');
    if(fundo && menu) {
        fundo.style.display = 'block';
        setTimeout(() => { menu.classList.add('aberto'); }, 10);
        atualizarCarrinhoDOM();
    }
}

function fecharModalCarrinho() {
    const fundo = document.getElementById('carrinho-fundo');
    const menu = document.getElementById('carrinho-menu');
    if(fundo && menu) {
        menu.classList.remove('aberto');
        setTimeout(() => { fundo.style.display = 'none'; }, 400); 
    }
}

function adicionarAoCarrinho() {
    if (!produtoSelecionado) return;
    
    const qtd = parseInt(document.getElementById('detalhe-qtd').value);
    let corNome = '';
    let estoqueDisponivel = parseInt(produtoSelecionado.estoque || 0);

    if (produtoSelecionado.cores && produtoSelecionado.cores.length > 0) {
        corNome = document.getElementById('detalhe-cor').value;
        if (!corNome) return alert("Produto esgotado!"); 
        
        const corObj = produtoSelecionado.cores.find(c => c.nome === corNome);
        estoqueDisponivel = parseInt(corObj.estoque || 0);
    }

    if (qtd < 1) return;

    // VERIFICAÇÃO DE ACÚMULO NO CARRINHO
    let existente = carrinho.find(item => item.id === produtoSelecionado._id && item.cor === corNome);
    
    if(existente) {
        if ((existente.quantidade + qtd) > estoqueDisponivel) {
            return alert(`Atenção: Só temos ${estoqueDisponivel} unds.\nVocê já adicionou ${existente.quantidade} na sacola.`);
        }
        existente.quantidade += qtd;
    } else {
        if (qtd > estoqueDisponivel) {
            return alert(`Atenção: Só temos ${estoqueDisponivel} unidades.`);
        }
        carrinho.push({
            id: produtoSelecionado._id,
            nome: produtoSelecionado.nome,
            preco: parseFloat(produtoSelecionado.precoFinal),
            quantidade: qtd,
            cor: corNome
        });
    }

    salvarCarrinhoLocal(); // Salva na memória F5
    fecharModal('modal-produto');
    abrirModalCarrinho(); 
}

function removerDoCarrinhoSeguro(index) {
    carrinho.splice(index, 1);
    salvarCarrinhoLocal(); // Atualiza a memória
    atualizarCarrinhoDOM();
}

function atualizarCarrinhoDOM() {
    const lista = document.getElementById('lista-carrinho-conteudo');
    const contador = document.getElementById('contador-carrinho');
    
    if(!lista || !contador) return;

    lista.innerHTML = '';
    let totalItens = 0;
    carrinho.forEach(item => totalItens += item.quantidade);
    contador.textContent = totalItens;

    if (carrinho.length === 0) {
        lista.innerHTML = `<div style="text-align: center; color: #888; margin-top: 40px;"><i class="fas fa-shopping-bag" style="font-size: 40px; color: #ccc; margin-bottom: 15px;"></i><p>Sua sacola está vazia.</p></div>`;
    } else {
        carrinho.forEach((item, index) => {
            const descCor = item.cor ? ` | Cor: ${item.cor}` : '';
            lista.innerHTML += `
            <div class="carrinho-item">
                <div style="flex: 1;">
                    <h4 style="margin: 0; color: var(--rosa-forte); font-size: 14px;">${item.nome}</h4>
                    <small style="color: #666;">Qtd: ${item.quantidade}${descCor}</small>
                    <p style="margin: 5px 0 0; font-weight: bold;">R$ ${(item.preco * item.quantidade).toFixed(2)}</p>
                </div>
                <button class="btn-remover" onclick="removerDoCarrinhoSeguro(${index})"><i class="fas fa-trash"></i></button>
            </div>`;
        });
    }
    calcularTotal();
}

function calcularTotal() {
    let subtotal = 0;
    carrinho.forEach(item => subtotal += (item.preco * item.quantidade));
    let frete = parseFloat(document.getElementById('select-frete-seguro').value) || 0;
    
    const divSubtotal = document.getElementById('carrinho-subtotal');
    const divTotal = document.getElementById('carrinho-total');
    
    if(divSubtotal) divSubtotal.textContent = subtotal.toFixed(2);
    if(divTotal) divTotal.textContent = (subtotal + frete).toFixed(2);
}

// --- VERIFICAÇÃO DE SEGURANÇA E FINALIZAÇÃO ---
async function finalizarCompra() {
    if (carrinho.length === 0) return alert("Sua sacola está vazia!");
    
    const selectFrete = document.getElementById('select-frete-seguro');
    if (selectFrete.value === "") return alert("Por favor, selecione uma opção de entrega ou retirada.");

    const btnBtn = document.querySelector('#carrinho-menu .btn-rosa');
    const textoOriginal = btnBtn.innerHTML;
    btnBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando estoque...';
    btnBtn.disabled = true;

    try {
        // DUPLA CHECAGEM NO SERVIDOR
        const resp = await fetch(`${API_URL}/produtos`);
        const bancoAtual = await resp.json();
        let problemas = [];

        for (let i = 0; i < carrinho.length; i++) {
            let item = carrinho[i];
            let prodDB = bancoAtual.find(p => p._id === item.id);
            
            // Se o produto foi apagado ou inativado pelo admin
            if (!prodDB || !prodDB.ativo) {
                problemas.push(`- "${item.nome}" não está mais disponível.`);
                continue;
            }

            // Checa quantidade
            let estoqueBanco = parseInt(prodDB.estoque || 0);
            if (item.cor && prodDB.cores) {
                let corDB = prodDB.cores.find(c => c.nome === item.cor);
                estoqueBanco = corDB ? parseInt(corDB.estoque || 0) : 0;
            }

            if (item.quantidade > estoqueBanco) {
                if (estoqueBanco === 0) {
                    problemas.push(`- "${item.nome}" esgotou enquanto você escolhia!`);
                } else {
                    problemas.push(`- "${item.nome}": Só restaram ${estoqueBanco} unidades.`);
                }
            }
        }

        // Se deu erro em algum produto
        if (problemas.length > 0) {
            alert("⚠️ ATENÇÃO:\n\n" + problemas.join("\n") + "\n\nPor favor, retire ou diminua a quantidade na sacola.");
            await carregarProdutos(); // Atualiza a tela para sumir o que acabou
            btnBtn.innerHTML = textoOriginal;
            btnBtn.disabled = false;
            return;
        }

        // PASSOU NA SEGURANÇA! VAI PRO WHATSAPP
        const freteNome = selectFrete.options[selectFrete.selectedIndex].text;
        const total = document.getElementById('carrinho-total').textContent;

        let msg = `🦋 *Novo Pedido - Bella Make* 🦋\n\n`;
        carrinho.forEach(item => {
            msg += `▫️ ${item.quantidade}x ${item.nome}`;
            if (item.cor) msg += ` (Cor: ${item.cor})`;
            msg += ` - R$ ${(item.preco * item.quantidade).toFixed(2)}\n`;
        });
        
        msg += `\n🚚 *Opção:* ${freteNome}\n`;
        msg += `💰 *Total a pagar: R$ ${total}*\n\n`;
        msg += `Aguardando informações para pagamento!`;

        // Limpa a sacola para não enviar duas vezes
        carrinho = [];
        salvarCarrinhoLocal(); 
        atualizarCarrinhoDOM();
        fecharModalCarrinho();

        const zapLink = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`;
        window.open(zapLink, '_blank');

    } catch (error) {
        alert("Erro na conexão ao checar o estoque. Tente novamente.");
    }

    btnBtn.innerHTML = textoOriginal;
    btnBtn.disabled = false;
}