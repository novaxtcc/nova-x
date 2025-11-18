import json
import os
import time
from typing import List, Dict, Any, Optional, Union
from Block import Block
from Moeda import Moeda

class Blockchain:
    def __init__(self, peer_node):
        from Logger import Logger
        self.logger = Logger(log_file="blockchain_logs.json", node_id=peer_node)
        self.chain = [self.create_genesis_block().__dict__]
        self.peer = ''
        self.peers = ['ws://127.0.0.1:8770']  # Conjunto de nós conectados à rede
        self.users = [
            {"user": "system", "cpf": "000.000.000-00", "email": "system@email.com", "key": "novaX"},
            {"user": "user1", "cpf": "000.000.000-01", "email": "user1@email.com", "key": "teste"},
            {"user": "user2", "cpf": "000.000.000-02", "email": "user2@email.com"}
        ]
        # self.users.append({})
        self.transactions = []  # Lista de transações pendentes
        self.maxSupplies = 100  # 1000000 # Quantidade máxima de moedas que podem ser criadas
        
        # Estrutura dual para balances:
        # 1. _coins armazena os objetos Moeda (para uso interno)
        # 2. balances armazena valores numéricos (para compatibilidade com servidores)
        self._coins = {}  # Dicionário de listas de moedas por usuário (interno)
        self.balances = {}  # Dicionário de saldos numéricos (para compatibilidade)
        
        self.lastCoin = None
        
        # Inicializa os saldos para todos os usuários
        for user in self.users:
            self._coins[user["user"]] = []
            self.balances[user["user"]] = 0.00000000

    def create_genesis_block(self):
        return Block(0, "0", "Genesis Block", time.time())
    
    def add_user(self, user, cpf, email, key):
        self.users.append({"user": user, "cpf": cpf, "email": email, "key": key})
        self._coins[user] = []
        self.balances[user] = 0.00000000
    
    def _update_numeric_balances(self):
        """Atualiza o dicionário de saldos numéricos com base nas moedas"""
        for user in self._coins:
            self.balances[user] = sum(moeda.value for moeda in self._coins[user])
    
    def return_coins(self):
        """Retorna as moedas para serem enviadas a novos laços"""
        users = {}
        for user in self._coins:
            coins = []
            for moeda in self._coins[user]:
                coins.append(moeda.convert_coin())
            users[user] = coins
        return users
    
    def define_coins(self, coins: dict):
        """Atualização inicial das moedas quando um nó novo é gerado"""
        for user in coins:
            m = []
            for coin in coins[user]:
                m.append(Moeda(coin['previous_hash'], coin['hash'], coin['user_id'], coin['next_hash'], float(coin['value'])))
            self._coins[user] = m
        return True
                
    
    def create_coins_with_logs(self):
        """
        Versão atualizada do create_coins com logs integrados.
        Cria as moedas iniciais do sistema.
        """
        from Moeda import Moeda
        import os
        
        print("criando moedas")
        if "system" not in self._coins:
            self._coins["system"] = []
            
        # Cria a primeira moeda (genesis)
        first_coin = Moeda.create_new_coin(user_id="system")
        self._coins["system"].append(first_coin)
        self.lastCoin = first_coin
        
        # Cria as demais moedas
        for i in range(1, self.maxSupplies):
            new_coin = Moeda.create_new_coin(user_id="system", last_coin=self.lastCoin)
            self._coins["system"].append(new_coin)
            self.lastCoin = new_coin
        
        # Atualiza balances
        self._update_numeric_balances()
        os.system('cls')
        
        # Log da criação de moedas
        total_value = sum(moeda.value for moeda in self._coins["system"])
        self.logger.log_coin_operation(
            "system",
            "CREATE",
            len(self._coins["system"]),
            total_value,
            {"max_supplies": self.maxSupplies}
        )
        
        return len(self._coins["system"])

    def login(self, user, key):
        """Verifica usuario e senha"""
        for registro in self.users:
            if (registro['user'] == user or registro['cpf'] == user) and registro['key'] == key:
                return True
        return False

    def search_user(self, param: str) -> Optional[str]:
        """Busca um usuário pelo nome, CPF ou email"""
        for user in self.users:
            if user['user'] == param or user['cpf'] == param:# or user['email'] == param:
                return user['user']
        return None
            
    def get_balance(self, param: str) -> Union[float, bool]:
        """Retorna o saldo total de um usuário"""
        if isinstance(param, dict):  # Compatibilidade com chamadas do server
            return sum(float(coin.get("value", 0)) for coin in param)
            
        user = self.search_user(param)
        if not user:
            return False
        
        # Retorna o saldo do dicionário de compatibilidade (Não retornar como objeto pois o servidor não esta pronto para receber)
        return self.balances[user]

    def get_latest_block(self):
        """Retorna o bloco mais recente da blockchain"""
        return self.chain[-1]
    

    def validate_coin_chain(self, user_id: str) -> tuple[bool, str]:
        """
        Valida a integridade da cadeia de moedas de um usuário
        Verifica se cada moeda tem o hash correto em relação à moeda anterior
        
        Returns:
            tuple: (is_valid, message)
        """
        user = self.search_user(user_id)
        if not user:
            return False, "Usuário não encontrado"
        
        if user not in self._coins:
            return False, "Usuário não possui moedas"
        
        user_coins = self._coins[user]
        
        if not user_coins:
            return True, "Usuário não possui moedas (válido)"
        
        # Valida cada moeda
        for coin in user_coins:
            # Se não é a primeira moeda (genesis)
            if coin.previous_hash != "0":
                # Procura a moeda anterior em toda a rede
                previous_coin = None
                
                for username, coins_list in self._coins.items():
                    for c in coins_list:
                        if c.hash == coin.previous_hash:
                            previous_coin = c
                            break
                    if previous_coin:
                        break
                
                # Se encontrou a moeda anterior
                if previous_coin:
                    # Verifica se o hash atual corresponde ao next_hash da moeda anterior
                    if previous_coin.next_hash != coin.hash:
                        return False, f"Hash inválido: moeda {coin.hash[:8]}... não corresponde ao next_hash da moeda anterior"
                else:
                    return False, f"Moeda anterior não encontrada para {coin.hash[:8]}..."
            
            # Verifica se o hash da própria moeda está correto
            expected_hash = coin.calculate_hash()
            if coin.next_hash != expected_hash:
                return False, f"Hash calculado incorreto para moeda {coin.hash[:8]}..."
        
        return True, "Cadeia de moedas válida"


    def validate_all_coins(self) -> dict:
        """
        Valida a integridade de todas as moedas de todos os usuários
        
        Returns:
            dict: Dicionário com resultado da validação de cada usuário
        """
        results = {}
        
        for user in self.users:
            username = user["user"]
            is_valid, message = self.validate_coin_chain(username)
            results[username] = {
                "valid": is_valid,
                "message": message,
                "coins_count": len(self._coins.get(username, []))
            }
        
        return results


    def get_coin_by_hash(self, coin_hash: str) -> Optional[Dict[str, Any]]:
        """
        Busca uma moeda específica pelo hash em toda a rede
        
        Returns:
            dict ou None: Dados da moeda se encontrada
        """
        for username, coins_list in self._coins.items():
            for coin in coins_list:
                if coin.hash == coin_hash:
                    return {
                        "user_id": coin.user_id,
                        "value": coin.value,
                        "hash": coin.hash,
                        "previous_hash": coin.previous_hash,
                        "next_hash": coin.next_hash,
                        "owner": username
                    }
        return None
    
    def add_transaction_with_logs(self, sender_id: str, receiver_id: str, amount: float):
        """
        Versão atualizada do add_transaction com logs integrados.
        Adiciona uma transação à blockchain e registra no log.
        """
        import json
        from Moeda import Moeda
        
        # Busca os usuários
        sender_user = self.search_user(sender_id)
        receiver_user = self.search_user(receiver_id)
        
        # Validações
        if not sender_user:
            self.logger.log_transaction(sender_id, receiver_id, amount, "FAILED", 
                                        error="Remetente não encontrado")
            return False
            
        if not receiver_user:
            self.logger.log_transaction(sender_id, receiver_id, amount, "FAILED",
                                        error="Destinatário não encontrado")
            return False
        
        if amount <= 0:
            self.logger.log_transaction(sender_user, receiver_user, amount, "FAILED",
                                        error="Valor inválido")
            return False
        
        # Verifica saldo
        if self.balances[sender_user] < amount:
            self.logger.log_transaction(sender_user, receiver_user, amount, "FAILED",
                                        error=f"Saldo insuficiente ({self.balances[sender_user]} < {amount})")
            return False
        
        try:
            # Adiciona a transação pendente
            self.transactions.append({
                'sender': sender_user,
                'receiver': receiver_user,
                'amount': amount
            })
            
            # Calcula as moedas necessárias
            moedas_a_usar, moedas_quebradas, moedas_criadas, moedas_atualizar = Moeda.calculate_transfer(
                self._coins[sender_user], amount
            )
            
            find = False
            for moeda in moedas_atualizar:
                for user_coins in self._coins.values():
                    for coin in user_coins:
                        if coin.hash == moeda['moeda']:
                            coin.previous_hash = moeda['hash_update']
                            find = True
                            break
                    if find:
                        break
            
            # Remove as moedas usadas do remetente
            for moeda in moedas_a_usar:
                try:
                    self._coins[sender_user].remove(moeda)
                except ValueError:
                    pass
            
            # Adiciona as moedas criadas (troco) ao remetente
            for moeda in moedas_criadas:
                if moeda not in moedas_a_usar:
                    self._coins[sender_user].append(moeda)
            
            # Transfere as moedas para o destinatário
            for moeda in moedas_a_usar:
                moeda.user_id = receiver_user
                # moeda.next_hash = moeda.calculate_hash()
                self._coins[receiver_user].append(moeda)

            # Atualiza o dicionário balances
            self._update_numeric_balances()
            
            # Minera o bloco
            new_block = self.mine_block_with_logs()

            # Combina as moedas
            self.combine_user_coins_with_logs(receiver_user)
            self.combine_user_coins_with_logs(sender_user)

            # Log de sucesso
            self.logger.log_transaction(
                sender_user, 
                receiver_user, 
                amount, 
                "SUCCESS",
                transaction_id=new_block.get('hash', 'unknown')
            )
            
            # Log da operação de moedas
            self.logger.log_coin_operation(
                sender_user,
                "TRANSFER_SENT",
                len(moedas_a_usar),
                amount,
                {"receiver": receiver_user, "coins_created": len(moedas_criadas)}
            )
            
            self.logger.log_coin_operation(
                receiver_user,
                "TRANSFER_RECEIVED",
                len(moedas_a_usar),
                amount,
                {"sender": sender_user}
            )

            return json.dumps(new_block)
            
        except ValueError as e:
            self.logger.log_transaction(sender_user, receiver_user, amount, "FAILED",
                                    error=str(e))
            self.logger.log_error("TRANSACTION_ERROR", str(e), {
                "sender": sender_user,
                "receiver": receiver_user,
                "amount": amount
            })
            print(f"Erro na transferência: {e}")
            return False

    def mine_block_with_logs(self):
        """
        Versão atualizada do mine_block com logs integrados.
        Cria e adiciona um novo bloco com as transações pendentes.
        """
        from Block import Block
        
        new_block = Block(
            index=len(self.chain),
            previous_hash=self.get_latest_block()['hash'],
            transactions=self.transactions
        )
        
        # Adiciona o bloco à cadeia
        block_dict = {
            "index": new_block.index, 
            "previous_hash": new_block.previous_hash, 
            "transactions": new_block.transactions, 
            "timestamp": new_block.timestamp, 
            "hash": new_block.hash
        }
        self.chain.append(block_dict)
        
        # Log do bloco minerado
        self.logger.log_block(
            new_block.index,
            new_block.hash,
            len(new_block.transactions),
            "MINED"
        )
        
        # Limpa as transações após a mineração
        self.transactions = []
        
        return block_dict

    def add_block_with_logs(self, block):
        """
        Versão atualizada do add_block com logs integrados.
        Adiciona um bloco validado à blockchain.
        """
        from Moeda import Moeda
        
        if block.previous_hash == self.get_latest_block()['hash']:
            # Para cada transação no bloco
            for tx in block.transactions:
                if isinstance(tx, dict) and 'sender' in tx and 'receiver' in tx and 'amount' in tx:
                    sender = tx['sender']
                    receiver = tx['receiver']
                    amount = tx['amount']
                    
                    # Verifica se precisa processar internamente as moedas
                    if sender in self._coins and receiver in self._coins:
                        try:
                            # Processa a transação na estrutura de moedas interna
                            moedas_a_usar, moedas_quebradas, moedas_criadas = Moeda.calculate_transfer(
                                self._coins[sender], amount
                            )
                            
                            # Remove as moedas usadas e quebradas do remetente
                            for moeda in moedas_a_usar:
                                if moeda in self._coins[sender]:
                                    self._coins[sender].remove(moeda)
                                    
                            # Adiciona moedas criadas (troco) ao remetente
                            for moeda in moedas_criadas:
                                if moeda not in moedas_a_usar:
                                    self._coins[sender].append(moeda)
                                    
                            # Transfere as moedas para o destinatário
                            for moeda in moedas_a_usar:
                                moeda.user_id = receiver
                                moeda.next_hash = moeda.calculate_hash()
                                self._coins[receiver].append(moeda)
                                
                            # Log da transação recebida
                            self.logger.log_transaction(
                                sender, 
                                receiver, 
                                amount, 
                                "SUCCESS",
                                transaction_id=block.hash
                            )
                            
                        except ValueError as e:
                            self.logger.log_error("BLOCK_TRANSACTION_ERROR", str(e), {
                                "sender": sender,
                                "receiver": receiver,
                                "amount": amount,
                                "block_hash": block.hash
                            })
            
            # Adiciona o bloco à cadeia
            self.chain.append(block.__dict__)

            # Combina as moedas
            self.combine_user_coins_with_logs(receiver)
            self.combine_user_coins_with_logs(sender)
            
            # Atualiza balances
            self._update_numeric_balances()
            
            # Log do bloco adicionado
            self.logger.log_block(
                block.index,
                block.hash,
                len(block.transactions),
                "ADDED"
            )
            
            return True
        
        # Log de bloco rejeitado
        self.logger.log_block(
            block.index,
            block.hash,
            len(block.transactions),
            "REJECTED"
        )
        return False

    def combine_user_coins_with_logs(self, user_id: str):
        """
        Versão atualizada do combine_user_coins com logs integrados.
        Combina moedas quebradas de um usuário.
        """
        from Moeda import Moeda
        
        user = self.search_user(user_id)
        if not user or user not in self._coins:
            return False
            
        # Pega todas as moedas quebradas do usuário
        moedas_quebradas = [moeda for moeda in self._coins[user] if moeda.value < 1.0]
        
        if not moedas_quebradas:
            return False
        
        coins_before = len(self._coins[user])
        value_before = sum(moeda.value for moeda in moedas_quebradas)
        
        # Combina as moedas
        moedas_criadas, moedas_destruidas = Moeda.combine_coins(moedas_quebradas, self._coins[user])
        
        # Remove as moedas destruídas
        for moeda in moedas_destruidas:
            if moeda in self._coins[user]:
                self._coins[user].remove(moeda)
                
        # Adiciona as novas moedas
        for moeda in moedas_criadas:
            self._coins[user].append(moeda)
        
        # Atualiza balances
        self._update_numeric_balances()
        
        coins_after = len(self._coins[user])
        
        # Log da operação
        self.logger.log_coin_operation(
            user,
            "COMBINE",
            len(moedas_quebradas),
            value_before,
            {
                "coins_created": len(moedas_criadas),
                "coins_destroyed": len(moedas_destruidas),
                "coins_before": coins_before,
                "coins_after": coins_after
            }
        )
            
        return True
       
    def get_chain_data(self) -> str:
        """Retorna os dados da blockchain em formato JSON"""
        return json.dumps(self.chain, indent=4)
    
    def add_peer(self, peer: str) -> None:
        """Adiciona um novo peer à rede"""
        if peer not in self.peers:
            self.peers.append(peer)
    
    def get_user_coins(self, param: str) -> List[Dict[str, Any]]:
        """Retorna todas as moedas de um usuário em formato de dicionário"""
        user = self.search_user(param)
        if not user:
            return []
            
        return [moeda.__dict__ for moeda in self._coins[user]]
    
    def get_coin_data(self) -> List[Dict[str, Any]]:
        """Retorna todas as moedas em formato de dicionário (para depuração)"""
        all_coins = []
        for user, coins in self._coins.items():
            for coin in coins:
                all_coins.append({
                    "user_id": coin.user_id,
                    "value": coin.value,
                    "hash": coin.hash,
                    "previous_hash": coin.previous_hash,
                    "next_hash": coin.next_hash
                })
        return all_coins
    
    def erase_coins(self):
        """Apaga todas as moedas da rede"""
        self._coins = {}

def show(blockchain):
    print("\n#### Dados NovaX ####")
    print(f"Blockchain: {len(blockchain.chain)} bloco(s)")
    print("Peers: ", blockchain.peers)
    print("Usuários: ", len(blockchain.users))
    
    for user in blockchain.users:
        username = user["user"]
        balance = blockchain.balances.get(username, 0)
        coins_count = len(blockchain._coins.get(username, []))
        print(f"- {username}: {balance:.2f} (em {coins_count} moedas)")
    
    print("#######################\n")

# if __name__ == "__main__":
#     blockchain = Blockchain()
#     coin_count = blockchain.create_coins()
#     print(f"Criadas {coin_count} moedas iniciais")
#     show(blockchain)
    
    # # Exemplo de transferência
    # result = blockchain.add_transaction("system", "user1", 1.5)
    # print(f"Transferência: {'Sucesso' if result else 'Falha'}")

    # show(blockchain)

    # print(f"Transferência: {'Sucesso' if blockchain.add_transaction("system", "user1", 0.72) else 'Falha'}")
    
    # # Combina moedas quebradas
    # blockchain.combine_user_coins("user1")
    
    # show(blockchain)

    """
    CRIAR UMA FUNÇÃO PARA RETORNAR UMA TRANSAÇÃO NA BLOCKCHAIN.
    DEVE RECEBER DADOS COMO REMETENTE, DESTINATÁRIO, VALOR
    DEVE RETORNAR SE HOUVE A TRANSAÇÃO"""