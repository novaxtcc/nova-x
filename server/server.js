import { insertUser, listUser, validaCPF, updateSenha, updateUserData, savePin, cambio, saveKey } from "./querys.js";

import express from "express";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000

// const cors = require("cors");
app.use(cors());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    next();
});

// Necessário para usar __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/app/assets')));

// Caminho base onde estão suas páginas
// const basePath = path.join(__dirname, '../app/pages');

app.use(express.static(path.join(__dirname, "/app/pages")));

app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '/app/pages/index/index.html'));
  } catch (e) {
    console.error(e);
    res.status(400).send('Erro ao carregar a página');
  }
});


app.post('/login', async (req, res) => {
    try {
        const data = req.body;
        let user;
        data.cpf = data.cpf.replace(/\D/g, '')
        // console.log(data)
        user = await listUser(data.cpf, data.password)
        if (user){
            // console.log(`Usuario logado ${user}`)
            res.status(200).json({"logged": true, "user": user});
        } else {
            res.json({"logged": false})
        }
            // console.log(req)
    } catch (e) {
        console.log(e)
        res.status(400).send(e.toString());
    }
});

app.post('/cadastro', async (req, res) => {
    try {
        const data = req.body;
        data.cpf = data.cpf.replace(/\D/g, '')
        data.telefone = data.telefone.replace(/\D/g, '')
        if (await insertUser(data.nome, data.data_nascimento, data.cpf, data.email, data.cep, data.senha, data.genero, data.estado, data.cidade, data.logradouro, data.numero, data.complemento, data.telefone, 0)){
            res.json({"message": `Usuário criado ${data.nome}`});
        } else {
            res.json({"message": `Falha ao criar usuario ${data.nome}`});
        }
    } catch (e) {
        res.status(400).send(e.toString());
    }
});

app.post('/validaCPF', async (req, res) => {
    try{
        const data = req.body;
        let user;
        // console.log(data)
        data.cpf = data.cpf.replace(/\D/g, '')
        user = await validaCPF(data.cpf)
        if (user){
            // console.log(user)
            res.json({"email": user.email, "telefone": user.telefone})
        }
        else{
            // console.log("Não achou")
            res.json({"message": "CPF não encontrado"})
        }
    } catch(e){
        // console.log(e)
        res.status(400).send(e.toString());
    }
});

// app.get()

app.post('/updateSenha', async (req, res) => {
    try{
        const data = req.body;
        data.cpf = data.cpf.replace(/\D/g, '')
        console.log(data)
        if(await updateSenha(data.cpf, data.novaSenha) > 0){
            res.json({"message": "Senha alterada com sucesso!"})
        } else {
            res.json({"message": "Falha ao alterar senha"})
        }
    } catch(e){
        console.log(e)
        res.status(400).send(e.toString());
    }
})

app.post('/savePin', async (req, res) => {
    try{
        const data = req.body;
        data.cpf = data.cpf.replace(/\D/g, '')
        console.log(data)
        if(await savePin(data.cpf, data.pinCode) > 0){
            res.json({"success": true})
        } else {
            res.json({"success": false})
        }
    } catch(e){
        console.log(e)
        res.status(400).send(e.toString());
    }
})

app.post('/saveKey', async (req, res) => {
    try{
        const data = req.body;
        data.cpf = data.cpf.replace(/\D/g, '')
        console.log(data)
        if(await saveKey(data.cpf) > 0){
            res.json({"success": true})
        } else {
            res.json({"success": false})
        }
    } catch(e){
        console.log(e)
        res.status(400).send(e.toString());
    }
})

app.post('/updateUserData', async (req, res) => {
    try{
        const data = req.body;
        data.cpf = data.cpf.replace(/\D/g, '')
        data.telefone = data.telefone.replace(/\D/g, '')
        console.log(data)
        let user = await updateUserData(data.cpf, data.nome_completo, data.email, data.telefone)
        if(user){
            res.json({"message": "Dados alterados com sucesso!", "user": user})
        } else {
            res.json({"message": "Falha ao alterar dados"})
        }
    } catch(e){
        console.log(e)
        res.status(400).send(e.toString());
    }
})

app.get('/cambio', async (req, res) => {
    try{
        let historico = await cambio()
        console.log(historico)
        if(historico){
            res.json(historico)
        } else {
            res.json({"message": "Historico vazio"})
        }
    } catch(e){
        console.log(e)
        res.status(400).send(e.toString());
    }
})

app.listen(port, () => {
    console.log(`Server running in ${port}`);
});