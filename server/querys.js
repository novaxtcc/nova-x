import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarCodigo(destinatario) {
  const codigo = Math.floor(100000 + Math.random() * 900000);

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: destinatario,
      subject: 'Código de Verificação',
      html: `<h2>Seu código é <b>${codigo}</b></h2>`,
    });

    console.log('✅ E-mail enviado via Resend');
    return codigo;
  } catch (error) {
    console.error('❌ Erro:', error);
    return null;
  }
}


// Configuração do banco
const config = {
  host: "sh00028.hostgator.com.br",
  user: "gabr1144_server",
  password: "lj]d[KA^-u[}",
  database: "gabr1144_cryptonovax",
  port: 3306,
};

// Inserir usuário
export async function insertUser(nome, dt_nasc, cpf, email, cep, senha, genero, uf, cidade, endereco, numero, complemento, telefone, vl) {
  let conexao;
  let ret = false
  try {
    conexao = await mysql.createConnection(config);

    // Gerar hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // SQL de inserção
    const sql = `
      INSERT INTO usuarios (
        nome_completo, data_nascimento, cpf, email, cep, senha, genero, uf, cidade, endereco, numero, complemento, telefone, valor_novax
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valores = [
      nome,
      dt_nasc,
      cpf,
      email,
      cep,
      senhaHash,
      genero,
      uf,
      cidade,
      endereco,
      numero,
      complemento,
      telefone,
      vl,
    ];

    const [resultado] = await conexao.execute(sql, valores);
    console.log("Usuário inserido com sucesso! ID:", resultado.insertId);
    ret = true
  } catch (erro) {
      console.error("Erro ao conectar:", erro);
  } finally {
    if (conexao) await conexao.end();
    console.log("Conexão encerrada.");
    return ret
  }
}

// Listar usuário e verificar senha
export async function listUser(cpf, senhaDigitada) {
  let conexao;
  let ret = false;

  try {
    conexao = await mysql.createConnection(config);

      // Parâmetros devem estar dentro de um array
    const [rows] = await conexao.execute(
      'SELECT * FROM usuarios WHERE cpf = ?;',
      [cpf]
    );

    if (rows.length === 0) {
      console.log('Usuário não encontrado ❌');
      return false;
    }

    const usuario = rows[0];

      // Verifica a senha com bcrypt
    const senhaCorreta = await bcrypt.compare(senhaDigitada, usuario.senha);
    if (senhaCorreta) {
      console.log('Senha correta ✅');
      ret = await userLoged(cpf);
    } else {
      console.log('Senha incorreta ❌');
    }
  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }

  return ret;
}

  // 🔹 Função para validar CPF e retornar dados do usuário
export async function validaCPF(cpf) {
  let conexao;
  let usuario = null;

  try {
    conexao = await mysql.createConnection(config);

    // Também aqui: o parâmetro deve ser um array
    const [rows] = await conexao.execute(
      'SELECT email, telefone FROM usuarios WHERE cpf = ?;',
      [cpf]
    );

    if (rows.length > 0) {
      usuario = rows[0];
    } else {
      console.log('CPF não encontrado ❌');
    }

  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }
  // console.log("Usuario: ", usuario)
  return usuario;
}

export async function updateSenha(cpf, senha) {
  let conexao;
  let usuario = null;
  try{
    conexao = await mysql.createConnection(config);
    const senhaHash = await bcrypt.hash(senha, 10);
    const [rows] = await conexao.execute(
      'UPDATE usuarios SET senha = ? WHERE cpf = ?;',
      [senhaHash, cpf]
    );
    // console.log(rows)
    usuario = rows.affectedRows
  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }
  // console.log(usuario)
  return usuario;
}

export async function savePin(cpf, pinCode) {
  let conexao;
  let usuario = null;
  try{
    conexao = await mysql.createConnection(config);
    const [rows] = await conexao.execute(
      'UPDATE usuarios SET pin = ? WHERE cpf = ?;',
      [pinCode, cpf]
    );
    // console.log(rows)
    usuario = rows.affectedRows
  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }
  // console.log(usuario)
  return usuario;
}

export async function saveKey(cpf) {
  let conexao;
  let usuario = null;
  try{
    conexao = await mysql.createConnection(config);
    const [rows] = await conexao.execute(
      'UPDATE usuarios SET member_blockchain = 1 WHERE cpf = ?;',
      [cpf]
    );
    // console.log(rows)
    usuario = rows.affectedRows
  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }
  // console.log(usuario)
  return usuario;
}

export async function updateUserData(cpf, nome_completo, email, telefone) {
  let conexao;
  let usuario = null;
  try{
    conexao = await mysql.createConnection(config);
    const [rows] = await conexao.execute(
      'UPDATE usuarios SET nome_completo = ?, email = ?, telefone = ? WHERE cpf = ?;',
      [nome_completo, email, telefone, cpf]
    );

    // console.log(rows)
    if([rows]){
      usuario = await userLoged(cpf)
    }
  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }
  // console.log(usuario)
  return usuario;
}

export async function userLoged(cpf) {
  let conexao;
  let usuario = null;

  try {
    conexao = await mysql.createConnection(config);

      // Parâmetros devem estar dentro de um array
    const [rows] = await conexao.execute(
      'SELECT cpf, email, member_blockchain, nome_completo, telefone, pin FROM usuarios WHERE cpf = ?;',
      [cpf]
    );
    usuario = rows[0];

  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }

  return usuario;
}

export async function cambio() {
  let conexao;
  let historico = null;

  try {
    conexao = await mysql.createConnection(config);

    // Também aqui: o parâmetro deve ser um array
    const [rows] = await conexao.execute(
      'SELECT data, valor FROM cambio;'
    );

    historico = rows

  } catch (erro) {
    console.error('Erro ao conectar:', erro);
  } finally {
    if (conexao) await conexao.end();
    console.log('Conexão encerrada.');
  }
  return historico;
}

// Exemplo de chamadas
// await insertUser();
// await listUser();
// await insertPeer();
// await selectPeers();
// await updatePeerStatus();
