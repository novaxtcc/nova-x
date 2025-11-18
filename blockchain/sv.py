import asyncio
import json
import os
import threading
import time
import uuid
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import websockets
from Block import Block
from Blockchain import Blockchain
from Logger import Logger

load_dotenv()

pending_validations = {}

PUBLIC_URL = os.getenv("PUBLIC_URL")
CURRENT_PORT = int(os.getenv("PORT"))
BOOTSTRAP_PEER = os.getenv("BOOTSTRAP_PEER")
BOOTSTRAP = False

peer_connections = {}  # peer_url -> websocket
peer_connections_lock = asyncio.Lock()

  # Função para validar uma transação localmente
def validate_transaction_locally(sender, key, receiver, amount): 
    """
    Valida se a transação é válida verificando: 
    1. Se o remetente tem saldo suficiente
    2. Se os hashes das moedas estão corretos (hash == next_hash da moeda anterior)
    """
    sender_user   = novaX.search_user(sender)
    receiver_user = novaX.search_user(receiver)
    
    if not sender_user or not receiver_user: 
        return False, "Usuário não encontrado"
    
    if not novaX.login(sender_user, key):
        return False, "Chave de transferência incorreta"
    
      # Verifica saldo
    if novaX.balances[sender_user] < amount: 
        return False, "Saldo insuficiente"
    
      # Verifica integridade das moedas do remetente
    sender_coins = novaX._coins.get(sender_user, [])
    for i, coin in enumerate(sender_coins): 
                                       # Verifica se existe moeda anterior
        if coin.previous_hash != "0":  # Não é a primeira moeda
                                       # Procura a moeda anterior
            prev_coin = None
            for user_coins_list in novaX._coins.values(): 
                for c in user_coins_list                    : 
                    if  c.hash == coin.previous_hash            : 
                        prev_coin = c
                        break
                if prev_coin: 
                    break
            
              # Valida se o hash atual corresponde ao next_hash da moeda anterior
            if prev_coin and prev_coin.next_hash != coin.hash:
                return False, f"Hash inválido na moeda {coin.hash}"
    
    return True, "Válida"


async def request_transaction_validation_with_logs(transaction_id, sender, key, receiver, amount): 
    """
    Versão atualizada com logs da função request_transaction_validation.
    Solicita validação da transação para todos os peers e registra no log.
    """
    import time
    import asyncio
    
    # Valida localmente PRIMEIRO
    is_valid_local, reason_local = validate_transaction_locally(sender, key, receiver, amount)
    
    # Conta apenas peers externos
    external_peers = [p for p in novaX.peers if f":{CURRENT_PORT}" not in p]
    total_peers = len(external_peers) + 1
    
    print(f"🔍 Validando transação {transaction_id[:8]}...")
    print(f"   Peers na rede: {total_peers} (1 local + {len(external_peers)} externos)")
    
    # Log da validação local
    logger.log_validation(
        transaction_id,
        novaX.peer,
        is_valid_local,
        reason_local
    )
    
    # Inicializa o rastreamento de validação
    pending_validations[transaction_id] = {
        'approvals': 1 if is_valid_local else 0,
        'rejections': 0 if is_valid_local else 1,
        'total_peers': total_peers,
        'sender': sender,
        'receiver': receiver,
        'amount': amount,
        'responses_received': {f'{PUBLIC_URL}:{CURRENT_PORT}'}
    }
    
    print(f"   Validação local: {'✓ APROVADO' if is_valid_local else '✗ REJEITADO'} - {reason_local}")
    
    # Se não há peers externos, decide imediatamente
    if len(external_peers) == 0:
        required_approvals = (total_peers // 2) + 1
        approved = pending_validations[transaction_id]['approvals'] >= required_approvals
        
        # Log do consenso
        logger.log_consensus(
            transaction_id,
            pending_validations[transaction_id]['approvals'],
            total_peers,
            approved
        )
        
        if approved:
            print(f"✓ Transação {transaction_id[:8]} APROVADA (1/1 - nó único)")
            return True
        else:
            print(f"✗ Transação {transaction_id[:8]} REJEITADA (0/1 - validação local falhou)")
            return False
    
    # Envia para peers externos
    import json
    validation_request = {
        'type': 'TRANSACTION_VALIDATION_REQUEST',
        'transaction_id': transaction_id,
        'sender': sender,
        'key': key,
        'receiver': receiver,
        'amount': amount,
        'peer': novaX.peer,
        'timestamp': time.time()
    }
    
    message = json.dumps(validation_request)
    await broadcast(message)
    
    # Aguarda respostas com timeout
    timeout = 20
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        validation_data = pending_validations[transaction_id]
        total_responses = validation_data['approvals'] + validation_data['rejections']
        required_approvals = (validation_data['total_peers'] // 2) + 1
        
        # Verifica se atingiu o consenso
        if validation_data['approvals'] >= required_approvals:
            logger.log_consensus(
                transaction_id,
                validation_data['approvals'],
                validation_data['total_peers'],
                True
            )
            print(f"✓ Transação {transaction_id[:8]} APROVADA ({validation_data['approvals']}/{validation_data['total_peers']})")
            return True
        
        # Verifica se já é impossível atingir consenso
        remaining_peers = validation_data['total_peers'] - total_responses
        if validation_data['approvals'] + remaining_peers < required_approvals:
            logger.log_consensus(
                transaction_id,
                validation_data['approvals'],
                validation_data['total_peers'],
                False
            )
            print(f"✗ Transação {transaction_id[:8]} REJEITADA ({validation_data['approvals']}/{validation_data['total_peers']})")
            return False
        
        await asyncio.sleep(0.1)
    
    # Timeout
    validation_data = pending_validations[transaction_id]
    required_approvals = (validation_data['total_peers'] // 2) + 1
    approved = validation_data['approvals'] >= required_approvals
    
    logger.log_consensus(
        transaction_id,
        validation_data['approvals'],
        validation_data['total_peers'],
        approved
    )
    
    if approved:
        print(f"✓ Transação {transaction_id[:8]} APROVADA por timeout ({validation_data['approvals']}/{validation_data['total_peers']})")
        return True
    else:
        print(f"✗ Transação {transaction_id[:8]} REJEITADA por timeout ({validation_data['approvals']}/{validation_data['total_peers']})")
        return False


async def execute_approved_transaction(sender, receiver, amount): 
    """
    Executa uma transação que foi aprovada pelo consenso
    """
    result = novaX.add_transaction_with_logs(sender, receiver, amount)
    if result: 
          # Notifica todos os peers sobre a transação aprovada
        message = json.dumps({
            'type'    : 'TRANSACTION_APPROVED',
            'sender'  : sender,
            'receiver': receiver,
            'amount'  : amount,
            'block'   : result
        })
        await broadcast(message)
        return True
    return False


  # Função para lidar com conexões de nós na rede P2P

async def client_receiver(ws, peer):
    """
    Lê mensagens da conexão que esse nó iniciou (ws) — espelha o mesmo processamento
    que fazemos em handle_peer_with_logs para conexões *entrantes*.
    """
    try:
        async for message in ws:
            # Reaproveita a mesma lógica de processamento
            await process_incoming_message(message, ws)
    except websockets.exceptions.ConnectionClosed:
        print(f"🔌 Conexão de cliente para {peer} fechada")
    except Exception as e:
        print(f"❌ Erro no client_receiver para {peer}: {e}")
    finally:
        # remove conexão do mapping
        async with peer_connections_lock:
            # remove todas as chaves que apontem para esse ws
            keys_to_remove = [k for k, v in peer_connections.items() if v is ws]
            for k in keys_to_remove:
                peer_connections.pop(k, None)

async def process_incoming_message(message, websocket):
    """
    Processa uma mensagem JSON recebida por qualquer websocket (server-side ou client-side).
    """
    import uuid
    from Block import Block

    try:
        data = json.loads(message)
    except Exception as e:
        print(f"❌ Mensagem inválida recebida: {e}")
        return

    # ---------- TRANSACTION_VALIDATION_REQUEST ----------
    if data.get('type') == 'TRANSACTION_VALIDATION_REQUEST':
        transaction_id = data['transaction_id']
        sender = data['sender']
        key = data['key']
        receiver = data['receiver']
        amount = data['amount']
        peer = data['peer']

        print(f"Recebida solicitação de validação: {transaction_id[:8]}...")

        is_valid, reason = validate_transaction_locally(sender, key, receiver, amount)

        logger.log_validation(transaction_id, novaX.peer, is_valid, reason)

        response = {
            'type': 'TRANSACTION_VALIDATION_RESPONSE',
            'transaction_id': transaction_id,
            'approved': is_valid,
            'reason': reason,
            'node': novaX.peer
        }

        # envia de volta para o solicitante usando conexão persistente
        try:
            await send_message(peer, json.dumps(response))
            print(f"{'✓' if is_valid else '✗'} Validação enviada: {is_valid} - {reason}")
        except Exception as e:
            print(f"⚠️ Erro ao enviar validação para {peer}: {e}")

    # ---------- TRANSACTION_VALIDATION_RESPONSE ----------
    elif data.get('type') == 'TRANSACTION_VALIDATION_RESPONSE':
        transaction_id = data['transaction_id']

        if transaction_id in pending_validations:
            node = data.get('node', 'unknown')
            if node not in pending_validations[transaction_id]['responses_received']:
                pending_validations[transaction_id]['responses_received'].add(node)

                logger.log_validation(
                    transaction_id,
                    node,
                    data['approved'],
                    data.get('reason', 'Sem motivo')
                )

                if data['approved']:
                    pending_validations[transaction_id]['approvals'] += 1
                    print(f"Aprovação recebida de {node}")
                else:
                    pending_validations[transaction_id]['rejections'] += 1
                    print(f"Rejeição recebida de {node}: {data.get('reason', 'Sem motivo')}")

    # ---------- TRANSACTION_APPROVED ----------
    elif data.get('type') == 'TRANSACTION_APPROVED':
        print("Transação aprovada recebida de outro nó")
        novaX.add_transaction_with_logs(data['sender'], data['receiver'], data['amount'])
        show()

    # ---------- NEW_TRANSACTION ----------
    elif data.get('type') == 'NEW_TRANSACTION':
        print("📝 Nova solicitação de transação")
        transaction_success = "false"
        message = ""

        transaction_id = str(uuid.uuid4())

        approved = await request_transaction_validation_with_logs(
            transaction_id,
            data['sender'],
            data['key'],
            data['receiver'],
            data['amount']
        )

        if approved:
            success = await execute_approved_transaction(
                data['sender'],
                data['receiver'],
                data['amount']
            )

            if success:
                message = "Transação executada com sucesso"
                transaction_success = "true"
                show()
            else:
                message = "Erro ao executar transação"
        else:
            message = "Transação rejeitada pelo consenso"

        if transaction_id in pending_validations:
            del pending_validations[transaction_id]
            
        print(message)
        msg = json.dumps({"type": "RESPONSE_TRANSACTION", "success": transaction_success, "message": message})
        await websocket.send(msg)

    # ---------- NEW_BLOCK ----------
    elif data.get('type') == 'NEW_BLOCK':
        new_block = Block(data['index'], data['previous_hash'],
                          data['transactions'], data['timestamp'], data['hash'])
        if novaX.add_block(new_block):
            await broadcast(message)
            show()

    # ---------- NEW_PEER ----------
    elif data.get('type') == 'NEW_PEER':
        peer = data['peer']
        if peer not in novaX.peers:
            novaX.add_peer(peer)
            logger.log_peer_event(peer, "ADDED")

        # se a mensagem veio por um websocket conhecido (servidor remoto que nos conectou),
        # vinculamos o websocket atual ao peer público para permitir respostas imediatas
        # (quando chamada pelo handle_peer_with_logs esse websocket será o que está na função)
        # Para conexões client-initiated (onde temos peer_connections), já está mapeado.
        try:
            # se websocket foi fornecido (server-side), mapeia:
            # (observe que às vezes process_incoming_message é executado por client_receiver,
            #  e nesses casos peer_connections já tem o mapping)
            # vamos tentar obter uma identificação do peer via data['peer']
            async with peer_connections_lock:
                # se há uma conexão ativa já para esse peer, não sobrescreve
                existing = peer_connections.get(peer)
                if existing is None:
                    # vincula a conexão atual se for socket server-side (tem remote_address)
                    # aqui `websocket` é o objeto real passado pelo handle_peer_with_logs
                    peer_connections[peer] = websocket

            # Se este nó é o bootstrap, envia INIT para o novo peer usando a conexão que acabamos de mapear
            if BOOTSTRAP:
                init_payload = {
                    "type": "INIT",
                    "peers": list(novaX.peers),
                    "transactions": list(novaX.transactions),
                    "balances": novaX.balances,
                    "chain": list(novaX.chain),
                    "coins": novaX.return_coins()
                }
                # enviar pela conexão já mapeada (mais seguro)
                try:
                    await send_message(peer, json.dumps(init_payload))
                except Exception:
                    # fallback: tente enviar diretamente pelo websocket recebido
                    try:
                        await websocket.send(json.dumps(init_payload))
                    except Exception as e:
                        print(f"⚠️ Não foi possível enviar INIT para {peer}: {e}")

        except Exception as e:
            print(f"❌ Erro ao processar NEW_PEER: {e}")

        # re-broadcast do NEW_PEER para os demais
        await broadcast(json.dumps(data))
        show()
        
        # ---------- INIT ----------
    
    elif data.get('type') == 'INIT':
        novaX.peers = data['peers']
        novaX.balances = data['balances']
        novaX.transactions = data['transactions']
        novaX.chain = data['chain']
        novaX.define_coins(data['coins'])
        show()

    # ---------- UPDATE_BALANCE ----------
    elif data.get('type') == 'UPDATE_BALANCE':
        if novaX.balances != data['balances']:
            novaX.balances = data['balances']

    # ---------- SIGIN ----------
    elif data.get('type') == 'SIGNUP_SIGNIN':
        username = data['username']
        key = data['key']
        cpf = data['cpf']
        email = data['email']
        if novaX.login(username, key):
            msg = json.dumps({
                'type': 'SINGED',
                'success': 'true',
                'username': username,
                'user': 'signin',
                'balance': novaX.balances[username]
            })
        elif username not in novaX.balances:
            novaX.add_user(username, cpf, email, key)
            msg = json.dumps({
                'type': 'SINGED',
                'success': 'true',
                'username': username,
                'user': 'signup',
                'balance': novaX.balances[username]
            })
            await broadcast(data)
        else:
            msg = json.dumps({
                'type': 'SINGED',
                'success': 'false'
            })
        try:
            show()
            await websocket.send(msg)
        except Exception as e:
            print(f"⚠️ Erro ao enviar SINGED: {e}")

    # ---------- BALANCE ----------
    elif data.get('type') == 'BALANCE':
        balances = json.dumps({'type': 'BALANCE', 'balances': novaX.balances[novaX.search_user(data['username'])]})
        try:
            await websocket.send(balances)
        except Exception as e:
            print(f"⚠️ Erro ao enviar BALANCE: {e}")

    # ---------- GET_CHAIN ----------
    elif data.get('type') == 'GET_CHAIN':
        chain = json.dumps({'type': 'GET_CHAIN', 'chain': novaX.chain})
        try:
            await websocket.send(chain)
        except Exception as e:
            print(f"⚠️ Erro ao enviar GET_CHAIN: {e}")

async def handle_peer_with_logs(websocket, path=None):
    """
    Quando um peer se conecta a este servidor, mantemos o websocket aberto e processamos mensagens.
    Se o peer enviar sua identificação (via NEW_PEER), mapeamos essa conexão ao peer público.
    """
    peer_address = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    print(f"🔗 Novo peer conectado: {peer_address}")
    logger.log_peer_event(peer_address, "CONNECTED")

    try:
        async for message in websocket:
            # ao receber qualquer mensagem, delega ao processor com o websocket atual
            await process_incoming_message(message, websocket)
    except websockets.exceptions.ConnectionClosed:
        logger.log_peer_event(peer_address, "DISCONNECTED")
        print(f"🔌 Peer desconectado: {peer_address}")
    except Exception as e:
        logger.log_peer_event(peer_address, "ERROR", {"error": str(e)})
        logger.log_error("PEER_HANDLER_ERROR", str(e), {"peer": peer_address})
        print(f"❌ Erro no handler do peer {peer_address}: {e}")
    finally:
        # remove quaisquer mappings que apontem para esse websocket
        async with peer_connections_lock:
            keys_to_remove = [k for k, v in peer_connections.items() if v is websocket]
            for k in keys_to_remove:
                peer_connections.pop(k, None)


def show(): 
    print("\n#### Dados NovaX ####")
    print(f"Blockchain: {len(novaX.chain)} bloco(s)")
    print("Peers: ", novaX.peers)
    print("Usuários: ", len(novaX.users))
    
    for user in novaX.users[:5]:   # Mostra apenas os primeiros 5 usuários
        username    = user["user"]
        balance     = novaX.balances.get(username, 0)
        coins_count = len(novaX._coins.get(username, []))
        print(f"- {username}: {balance:.8f} (em {coins_count} moedas)")
    
    if len(novaX.users) > 5: 
        print(f"... e mais {len(novaX.users) - 5} usuários")
    
    print("#######################\n")


  # Propaga a mensagem para todos os nós conectados

async def connect_to_peer(peer):
    """
    Cria e mantém uma conexão WebSocket persistente (se ainda não existir).
    Também cria uma task para receber mensagens vindas dessa conexão (cliente).
    """
    async with peer_connections_lock:
        # se já tivermos conexão e ela não estiver fechada, reuse
        ws = peer_connections.get(peer)
        try:
            if ws and not ws.closed:
                return ws
        except:
            pass
        
        try:
            ws = await websockets.connect(peer)
            peer_connections[peer] = ws
            # cria task para escutar essa conexão (cliente-initiated)
            asyncio.create_task(client_receiver(ws, peer))
            print(f"✅ Conectado a peer {peer}")
            return ws
        except Exception as e:
            print(f"⚠️ Erro ao conectar em {peer}: {e}")
            # garante remoção em caso de falha
            if peer in peer_connections:
                peer_connections.pop(peer, None)
            raise

async def send_message(peer, message):
    """
    Envia mensagem a um peer usando conexão persistente. Reconnect automático simples se necessário.
    """
    try:
        ws = peer_connections.get(peer)
        try:
            if not ws or ws.closed:
                ws = await connect_to_peer(peer)
        except:
            ws = await connect_to_peer(peer)
        await ws.send(message)
    except Exception as e:
        print(f"⚠️ Erro ao enviar para {peer}: {e}")
        # tenta remover a conexão ruim
        async with peer_connections_lock:
            if peer in peer_connections and peer_connections[peer] is ws:
                try:
                    await peer_connections[peer].close()
                except:
                    pass
                peer_connections.pop(peer, None)

async def broadcast(message):
    """
    Propaga mensagem para todos os peers conhecidos, exceto si mesmo.
    Usa send_message (conexões persistentes).
    """
    try:
        data = json.loads(message)
        if 'isSendBroadcast' in data and data['isSendBroadcast']:
            # já foi broadcastado, evita re-broadcast infinito
            return
        # marca para evitar re-broadcast infinito por outros nós
        message_to_send = json.dumps({'isSendBroadcast': True, **data})

        peers_snapshot = list(novaX.peers)
        for peer in peers_snapshot:
            # não envia para si mesmo
            if f":{CURRENT_PORT}" in peer:
                continue
            # envia com timeout (não bloqueará o loop)
            try:
                await send_message(peer, message_to_send)
            except Exception as e:
                print(f"⚠️ Erro no broadcast para {peer}: {e}")
    except Exception as e:
        print(f"❌ Erro no broadcast: {e}")

async def p2p(peer, message):
    """
    Compatibilidade: envia 1 mensagem usando a conexão persistente.
    """
    await send_message(peer, message)


# Função assíncrona para iniciar o servidor P2P
async def start_server():
    server = await websockets.serve(handle_peer_with_logs, "0.0.0.0", CURRENT_PORT, reuse_address=True)
    novaX.peer = f'{PUBLIC_URL}:{CURRENT_PORT}'

    # Se não for bootstrap, conecta ao bootstrap e envia NEW_PEER via conexão persistente
    if novaX.peer != BOOTSTRAP_PEER:
        try:
            # conecta persistentemente ao bootstrap
            await connect_to_peer(BOOTSTRAP_PEER)
            # envia NEW_PEER via conexão persistente (p2p)
            await p2p(BOOTSTRAP_PEER, json.dumps({"type": 'NEW_PEER', 'peer': novaX.peer}))
        except Exception as e:
            print(f"⚠️ Não foi possível anunciar ao bootstrap {BOOTSTRAP_PEER}: {e}")
    else:
        global BOOTSTRAP
        BOOTSTRAP = True

    print(f"🚀 Servidor P2P iniciado na porta {CURRENT_PORT}")
    print("📡 Sistema de consenso ativado (50%+1 de aprovação)")
    show()

    await server.wait_closed()


# Inicia o nó P2P em uma thread separada
if __name__ == "__main__":
    novaX = Blockchain(PUBLIC_URL)
    novaX.create_coins_with_logs()
    logger = Logger(log_file="blockchain_logs.json", node_id=novaX.peer)
    novaX.logger = logger
    # show()
    threading.Thread(target=lambda: asyncio.run(start_server())).start()