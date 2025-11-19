# NovaX — Sistema Blockchain + API Node.js

Este projeto combina uma **blockchain em Python** com uma **API em Node.js**, permitindo operações distribuídas, transações e integração com serviços externos.

## 🚀 Requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Python 3.10+**
- **Node.js 18+**
- **pip**
- **npm**

---

# 📦 Instalação

## 🐍 1. Instalar dependências do Python

```bash
pip install -r requeriments.txt
```

## 🟢 2. Instalar dependências do Node.js

```bash
npm install cors path mysql bcryptjs express resend dotenv
```

---

# ▶️ Execução do Projeto

O projeto exige **dois terminais abertos simultaneamente**, um para o servidor Node.js e outro para a blockchain Python.

## 🟢 1. Iniciar o servidor Node.js

```bash
cd server
node server.js
```

## 🐍 2. Iniciar a blockchain em Python

```bash
cd blockchain
python sv.py
```

---

# 🌐 Acessar a Aplicação

Acesse no navegador:

```
http://localhost:3000
```

---

# 📁 Estrutura Geral

```
NovaX/
│── server/
│   ├── server.js
│   └── ...
│
│── blockchain/
│   ├── sv.py
│   └── ...
│
├── requirements.txt
└── README.md
```
