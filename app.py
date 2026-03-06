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

# Criar senha padrão (gaby123) se for a primeira vez
if admin_col.count_documents({}) == 0:
    senha_criptografada = generate_password_hash("gaby123")
    admin_col.insert_one({"usuario": "admin", "senha": senha_criptografada})

# --- ROTAS ---
@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    admin = admin_col.find_one({"usuario": "admin"})
    if admin and check_password_hash(admin['senha'], dados.get('senha')):
        return jsonify({"sucesso": True, "mensagem": "Login aprovado!"}), 200
    return jsonify({"sucesso": False, "mensagem": "Senha incorreta!"}), 401

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
    resultado = produtos_col.insert_one(novo_produto)
    novo_produto['_id'] = str(resultado.inserted_id)
    return jsonify({"sucesso": True, "produto": novo_produto}), 201

@app.route('/produtos/<id>', methods=['DELETE'])
def delete_produto(id):
    produtos_col.delete_one({"_id": ObjectId(id)})
    return jsonify({"sucesso": True, "mensagem": "Produto apagado!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)