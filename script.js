const WHATSAPP_NUMERO = "5587981790842";
const API_URL = "https://bellamake.onrender.com"; // Endereço do seu Python local
let produtosGlobais = [];

// --- FUNÇÕES DA VITRINE ---
async function carregarProdutos() {
    try {
        const resposta = await fetch(`${API_URL}/produtos`);
        produtosGlobais = await resposta.json();
        renderizarProdutos(produtosGlobais);
        
        // Se estiver no admin, carrega a lista lá também
        if(document.getElementById('listaAdmin')) {
            renderizarAdmin();
        }
    } catch (erro) {
        console.error("Erro ao ligar ao servidor:", erro);
        const grid = document.getElementById('productGrid');
        if(grid) grid.innerHTML = '<p style="text-align:center; color:red;">Erro ao ligar ao banco de dados. Verifique se o Python está a rodar.</p>';
    }
}

function renderizarProdutos(lista) {
    const grid = document.getElementById('productGrid');
    if (!grid) return; 
    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Nenhum produto encontrado.</p>';
        return;
    }

    lista.forEach(prod => {
        grid.innerHTML += `
            <div class="card">
                <img src="${prod.img}" alt="${prod.nome}">
                <div class="card-info">
                    <h3>${prod.nome}</h3>
                    <p>R$ ${parseFloat(prod.preco).toFixed(2).replace('.', ',')}</p>
                    <button class="btn-buy" onclick="comprarZap('${prod.nome}')">
                        <i class="fab fa-whatsapp"></i> Comprar
                    </button>
                </div>
            </div>
        `;
    });
}

function comprarZap(nomeProduto) {
    const texto = encodeURIComponent(`Olá Jamile! Gostaria de comprar o produto: *${nomeProduto}*`);
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`, '_blank');
}

function filtrarCategoria(categoria) {
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (categoria === 'Todos') {
        renderizarProdutos(produtosGlobais);
    } else {
        const filtrados = produtosGlobais.filter(p => p.categoria === categoria);
        renderizarProdutos(filtrados);
    }
}

function filtrarNaTela() {
    const termo = document.getElementById('searchInput').value.toLowerCase();
    const filtrados = produtosGlobais.filter(p => p.nome.toLowerCase().includes(termo));
    renderizarProdutos(filtrados);
}

// --- FUNÇÕES DO ADMIN ---
async function verificarSenha() {
    const senha = document.getElementById('senhaAdmin').value;
    
    try {
        const resposta = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: senha })
        });
        
        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            carregarProdutos(); // Garante que carrega atualizado
        } else {
            alert('Senha incorreta!');
        }
    } catch (erro) {
        alert('Erro ao ligar ao servidor. O Python está ligado?');
    }
}

async function salvarProduto(event) {
    event.preventDefault();
    const btn = event.submitter;
    btn.innerText = "A guardar...";
    btn.disabled = true;

    const novoProduto = {
        nome: document.getElementById('nomeProd').value,
        preco: document.getElementById('precoProd').value,
        categoria: document.getElementById('catProd').value,
        img: document.getElementById('imgProd').value
    };

    try {
        await fetch(`${API_URL}/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoProduto)
        });
        
        document.getElementById('formProduto').reset();
        await carregarProdutos(); // Recarrega a lista do banco
        alert('Produto guardado com sucesso no MongoDB!');
    } catch (erro) {
        alert('Erro ao guardar o produto.');
    } finally {
        btn.innerText = "Guardar Produto no Banco";
        btn.disabled = false;
    }
}

function renderizarAdmin() {
    const lista = document.getElementById('listaAdmin');
    if (!lista) return;
    lista.innerHTML = '';
    
    produtosGlobais.forEach(prod => {
        lista.innerHTML += `
            <div class="card-admin">
                <span><strong>${prod.nome}</strong> (R$ ${prod.preco})</span>
                <button class="btn-delete" onclick="deletarProduto('${prod._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
}

async function deletarProduto(id) {
    if(confirm('Tem certeza que deseja apagar este produto permanentemente do banco de dados?')) {
        try {
            await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
            await carregarProdutos(); // Recarrega a lista atualizada
        } catch (erro) {
            alert('Erro ao apagar o produto.');
        }
    }
}

// Inicia a aplicação carregando os produtos do MongoDB
window.onload = carregarProdutos;