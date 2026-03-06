from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
import os

app = Flask(__name__)
# Permite que o frontend comunique com o backend
CORS(app) 

# Conexão com o banco de dados
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://brenokelv_db_user:WJYXhrWCQWfanS8y@cluster0.l2b0ldo.mongodb.net/?appName=Cluster0")
client = MongoClient(MONGO_URI)
db = client['gabymakes']
produtos_col = db['produtos']
admin_col = db['admin']
fretes_col = db['fretes'] # Nova coleção para as taxas de entrega

# Criar senha padrão (gaby123) e fretes iniciais se for a primeira vez
if admin_col.count_documents({}) == 0:
    senha_criptografada = generate_password_hash("gaby123")
    admin_col.insert_one({"usuario": "admin", "senha": senha_criptografada})

if fretes_col.count_documents({}) == 0:
    fretes_col.insert_many([
        {"cidade": "Retirar na Loja", "valor": 0.0},
        {"cidade": "Afogados da Ingazeira", "valor": 5.0},
        {"cidade": "Carnaíba", "valor": 10.0}
    ])

# --- ROTAS DE LOGIN ---
@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    admin = admin_col.find_one({"usuario": "admin"})
    if admin and check_password_hash(admin['senha'], dados.get('senha')):
        return jsonify({"sucesso": True, "mensagem": "Login aprovado!"}), 200
    return jsonify({"sucesso": False, "mensagem": "Senha incorreta!"}), 401

# --- ROTAS DE PRODUTOS ---
@app.route('/produtos', methods=['GET'])
def get_produtos():
    produtos = []
    for prod in produtos_col.find():
        prod['_id'] = str(prod['_id'])
        produtos.append(prod)
    return jsonify(produtos)

@app.route('/produtos', methods=['POST'])
def add_produto():
    novo_produto = request.json
    # Garantindo valores padrão se o admin esquecer de preencher
    novo_produto['estoque'] = int(novo_produto.get('estoque', 0))
    novo_produto['ativo'] = novo_produto.get('ativo', True)
    novo_produto['cores'] = novo_produto.get('cores', []) 
    
    resultado = produtos_col.insert_one(novo_produto)
    novo_produto['_id'] = str(resultado.inserted_id)
    return jsonify({"sucesso": True, "produto": novo_produto}), 201

@app.route('/produtos/<id>', methods=['PUT'])
def update_produto(id):
    dados = request.json
    # Converte o estoque para número inteiro, caso venha como texto do HTML
    if 'estoque' in dados:
        dados['estoque'] = int(dados['estoque'])
        
    produtos_col.update_one({"_id": ObjectId(id)}, {"$set": dados})
    return jsonify({"sucesso": True, "mensagem": "Produto atualizado com sucesso!"})

@app.route('/produtos/<id>', methods=['DELETE'])
def delete_produto(id):
    produtos_col.delete_one({"_id": ObjectId(id)})
    return jsonify({"sucesso": True, "mensagem": "Produto apagado!"})

# --- ROTAS DE FRETES ---
@app.route('/fretes', methods=['GET'])
def get_fretes():
    fretes = []
    for f in fretes_col.find():
        f['_id'] = str(f['_id'])
        fretes.append(f)
    return jsonify(fretes)

@app.route('/fretes', methods=['POST'])
def add_frete():
    novo_frete = request.json
    novo_frete['valor'] = float(novo_frete.get('valor', 0.0))
    resultado = fretes_col.insert_one(novo_frete)
    novo_frete['_id'] = str(resultado.inserted_id)
    return jsonify({"sucesso": True, "frete": novo_frete}), 201

@app.route('/fretes/<id>', methods=['DELETE'])
def delete_frete(id):
    fretes_col.delete_one({"_id": ObjectId(id)})
    return jsonify({"sucesso": True, "mensagem": "Frete apagado!"})

# --- ROTA DO CARRINHO (BAIXA NO ESTOQUE) ---
@app.route('/comprar', methods=['POST'])
def registrar_compra():
    carrinho = request.json.get('carrinho', [])
    
    # Valida e baixa o estoque de cada item do carrinho
    for item in carrinho:
        produto_id = item.get('id')
        qtd = int(item.get('quantidade', 1))
        
        produto = produtos_col.find_one({"_id": ObjectId(produto_id)})
        
        # Se o produto existe e tem estoque suficiente
        if produto and produto.get('estoque', 0) >= qtd:
            novo_estoque = produto['estoque'] - qtd
            produtos_col.update_one({"_id": ObjectId(produto_id)}, {"$set": {"estoque": novo_estoque}})
        else:
            return jsonify({"sucesso": False, "mensagem": f"Estoque insuficiente para o produto ID {produto_id}."}), 400
            
    return jsonify({"sucesso": True, "mensagem": "Compra registrada e estoque atualizado!"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)