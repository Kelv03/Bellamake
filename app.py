from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
import os

app = Flask(__name__)
CORS(app) 

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://brenokelv_db_user:WJYXhrWCQWfanS8y@cluster0.l2b0ldo.mongodb.net/?appName=Cluster0")
client = MongoClient(MONGO_URI)
db = client['gabymakes']
produtos_col = db['produtos']
admin_col = db['admin']
fretes_col = db['fretes']
vendedores_col = db['vendedores']

# Forçar a criação do admin ou atualização da senha para mila123
if admin_col.count_documents({"usuario": "admin"}) == 0:
    admin_col.insert_one({"usuario": "admin", "senha": generate_password_hash("mila123")})
else:
    admin_col.update_one({"usuario": "admin"}, {"$set": {"senha": generate_password_hash("mila123")}})

if fretes_col.count_documents({}) == 0:
    fretes_col.insert_many([
        {"cidade": "Retirar na Loja", "valor": 0.0},
        {"cidade": "Afogados da Ingazeira", "valor": 5.0}
    ])

@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    usuario = dados.get('usuario', 'admin') # Se não mandar usuário, assume que é o admin
    senha = dados.get('senha')

    if usuario == 'admin':
        admin = admin_col.find_one({"usuario": "admin"})
        if admin and check_password_hash(admin['senha'], senha):
            return jsonify({"sucesso": True, "tipo": "admin", "mensagem": "Login admin aprovado!"}), 200
    else:
        vendedor = vendedores_col.find_one({"usuario": usuario})
        if vendedor and check_password_hash(vendedor['senha'], senha):
            return jsonify({"sucesso": True, "tipo": "vendedor", "mensagem": "Login vendedor aprovado!"}), 200
            
    return jsonify({"sucesso": False, "mensagem": "Usuário ou senha incorretos!"}), 401

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
    novo_produto['estoque'] = int(novo_produto.get('estoque', 0))
    novo_produto['ativo'] = novo_produto.get('ativo', True)
    novo_produto['cores'] = novo_produto.get('cores', []) # Agora será [{nome: "Cor A", estoque: 5}]
    
    # Se o produto tem cores, o estoque total é a soma do estoque das cores
    if novo_produto['cores']:
        novo_produto['estoque'] = sum(int(c.get('estoque', 0)) for c in novo_produto['cores'])

    resultado = produtos_col.insert_one(novo_produto)
    novo_produto['_id'] = str(resultado.inserted_id)
    return jsonify({"sucesso": True, "produto": novo_produto}), 201

@app.route('/produtos/<id>', methods=['PUT'])
def update_produto(id):
    dados = request.json
    if 'estoque' in dados and not dados.get('cores'):
        dados['estoque'] = int(dados['estoque'])
    
    if 'cores' in dados and dados['cores']:
        dados['estoque'] = sum(int(c.get('estoque', 0)) for c in dados['cores'])

    produtos_col.update_one({"_id": ObjectId(id)}, {"$set": dados})
    return jsonify({"sucesso": True, "mensagem": "Produto atualizado!"})

@app.route('/produtos/<id>', methods=['DELETE'])
def delete_produto(id):
    produtos_col.delete_one({"_id": ObjectId(id)})
    return jsonify({"sucesso": True, "mensagem": "Produto apagado!"})

# FRETES
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

# VENDEDORES (NOVO)
@app.route('/vendedores', methods=['GET'])
def get_vendedores():
    vendedores = []
    for v in vendedores_col.find():
        v['_id'] = str(v['_id'])
        v.pop('senha', None)
        vendedores.append(v)
    return jsonify(vendedores)

@app.route('/vendedores', methods=['POST'])
def add_vendedor():
    dados = request.json
    if vendedores_col.find_one({"usuario": dados['usuario']}):
        return jsonify({"sucesso": False, "mensagem": "Usuário já existe!"}), 400
        
    dados['senha'] = generate_password_hash(dados['senha'])
    resultado = vendedores_col.insert_one(dados)
    dados['_id'] = str(resultado.inserted_id)
    dados.pop('senha', None)
    return jsonify({"sucesso": True, "vendedor": dados}), 201

@app.route('/vendedores/<id>', methods=['DELETE'])
def delete_vendedor(id):
    vendedores_col.delete_one({"_id": ObjectId(id)})
    return jsonify({"sucesso": True, "mensagem": "Vendedor apagado!"})

# ROTA DE COMPRAR / VENDA PDV (ESTOQUE INTELIGENTE)
@app.route('/comprar', methods=['POST'])
def registrar_compra():
    carrinho = request.json.get('carrinho', [])
    
    for item in carrinho:
        produto_id = item.get('id')
        qtd = int(item.get('quantidade', 1))
        cor_comprada = item.get('cor', '')
        
        produto = produtos_col.find_one({"_id": ObjectId(produto_id)})
        if not produto:
            return jsonify({"sucesso": False, "mensagem": f"Produto não encontrado."}), 400

        # Lógica para baixar estoque de Cor específica
        if cor_comprada and produto.get('cores'):
            cor_encontrada = False
            for c in produto['cores']:
                if c['nome'] == cor_comprada:
                    cor_encontrada = True
                    if int(c.get('estoque', 0)) >= qtd:
                        c['estoque'] = int(c['estoque']) - qtd
                    else:
                        return jsonify({"sucesso": False, "mensagem": f"Estoque insuficiente na cor {cor_comprada}."}), 400
                    break
            
            if not cor_encontrada:
                return jsonify({"sucesso": False, "mensagem": f"Cor {cor_comprada} não encontrada."}), 400
            
            # Atualiza a cor e o estoque total no banco
            novo_estoque_total = sum(int(c['estoque']) for c in produto['cores'])
            produtos_col.update_one(
                {"_id": ObjectId(produto_id)}, 
                {"$set": {"cores": produto['cores'], "estoque": novo_estoque_total}}
            )

        # Lógica para produto sem cor
        else:
            if produto.get('estoque', 0) >= qtd:
                novo_estoque = produto['estoque'] - qtd
                produtos_col.update_one({"_id": ObjectId(produto_id)}, {"$set": {"estoque": novo_estoque}})
            else:
                return jsonify({"sucesso": False, "mensagem": "Estoque insuficiente."}), 400
            
    return jsonify({"sucesso": True, "mensagem": "Compra registrada!"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)