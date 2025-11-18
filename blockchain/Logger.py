import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional


class Logger:
    """
    Sistema de logs para a blockchain NovaX.
    Grava logs em arquivo JSON contendo informações sobre transações,
    validações, blocos e eventos da rede.
    """
    
    def __init__(self, log_file: str = "blockchain_logs.json", node_id: str = "unknown"):
        """
        Inicializa o logger.
        
        Args:
            log_file: Nome do arquivo de log JSON
            node_id: Identificador do nó (ex: "ws://127.0.0.1:8770")
        """
        self.log_file = log_file
        self.node_id = node_id
        self.logs = []
        self._load_logs()
    
    @staticmethod
    def _create_user_hash(user_id: str) -> str:
        """
        Cria um hash de 16 caracteres para identificar um usuário de forma anônima.
        
        Args:
            user_id: Identificador do usuário
            
        Returns:
            Hash de 16 caracteres
        """
        import hashlib
        return hashlib.sha256(user_id.encode()).hexdigest()[:16]
    
    def _load_logs(self) -> None:
        """Carrega logs existentes do arquivo JSON"""
        if os.path.exists(self.log_file):
            try:
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    self.logs = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"⚠️ Erro ao carregar logs: {e}. Iniciando novo arquivo de log.")
                self.logs = []
    
    def _save_logs(self) -> None:
        """Salva os logs no arquivo JSON"""
        try:
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump(self.logs, f, indent=4, ensure_ascii=False)
        except IOError as e:
            print(f"❌ Erro ao salvar logs: {e}")
    
    def _create_log_entry(self, log_type: str, status: str, details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria uma entrada de log padronizada.
        
        Args:
            log_type: Tipo do log (TRANSACTION, VALIDATION, BLOCK, etc.)
            status: Status da operação (SUCCESS, FAILED, PENDING, etc.)
            details: Detalhes específicos do evento
        
        Returns:
            Dicionário com a entrada de log formatada
        """
        return {
            "timestamp": datetime.now().isoformat(),
            "node": self.node_id,
            "type": log_type,
            "status": status,
            "details": details
        }
    
    def log_transaction(self, sender: str, receiver: str, amount: float, 
                       status: str, transaction_id: Optional[str] = None,
                       error: Optional[str] = None, sender_node: Optional[str] = None,
                       receiver_node: Optional[str] = None) -> None:
        """
        Registra uma transação usando apenas hashes de identificação.
        
        Args:
            sender: ID do remetente (será convertido para hash)
            receiver: ID do destinatário (será convertido para hash)
            amount: Valor transferido
            status: Status (SUCCESS, FAILED, PENDING)
            transaction_id: ID único da transação
            error: Mensagem de erro (se houver)
            sender_node: Nó de origem (opcional)
            receiver_node: Nó de destino (opcional)
        """
        # Cria hashes para ocultar identidades
        sender_hash = self._create_user_hash(sender)
        receiver_hash = self._create_user_hash(receiver)
        
        details = {
            "sender_hash": sender_hash,
            "receiver_hash": receiver_hash,
            "amount": amount,
        }
        
        # Adiciona informações dos nós se fornecidas
        if sender_node:
            details["sender_node"] = sender_node
        if receiver_node:
            details["receiver_node"] = receiver_node
        
        if transaction_id:
            details["transaction_id"] = transaction_id
        
        if error:
            details["error"] = error
        
        log_entry = self._create_log_entry("TRANSACTION", status, details)
        self.logs.append(log_entry)
        self._save_logs()
        
        # Print colorido para o console (usando hashes)
        status_emoji = "✓" if status == "SUCCESS" else "✗" if status == "FAILED" else "⏳"
        print(f"{status_emoji} LOG: Transação {sender_hash} → {receiver_hash}: {amount} [{status}]")
    
    def log_validation(self, transaction_id: str, validator_node: str, 
                      approved: bool, reason: Optional[str] = None) -> None:
        """
        Registra uma validação de transação.
        
        Args:
            transaction_id: ID da transação validada
            validator_node: Nó que fez a validação
            approved: Se foi aprovada ou rejeitada
            reason: Motivo da decisão
        """
        details = {
            "transaction_id": transaction_id,
            "validator_node": validator_node,
            "approved": approved
        }
        
        if reason:
            details["reason"] = reason
        
        status = "APPROVED" if approved else "REJECTED"
        log_entry = self._create_log_entry("VALIDATION", status, details)
        self.logs.append(log_entry)
        self._save_logs()
        
        print(f"{'✓' if approved else '✗'} LOG: Validação {transaction_id[:8]}... por {validator_node} [{status}]")
    
    def log_consensus(self, transaction_id: str, total_approvals: int, 
                     total_peers: int, approved: bool) -> None:
        """
        Registra o resultado do consenso.
        
        Args:
            transaction_id: ID da transação
            total_approvals: Total de aprovações recebidas
            total_peers: Total de peers na rede
            approved: Se o consenso aprovou
        """
        details = {
            "transaction_id": transaction_id,
            "total_approvals": total_approvals,
            "total_peers": total_peers,
            "consensus_reached": approved,
            "approval_rate": f"{(total_approvals/total_peers)*100:.1f}%" if total_peers > 0 else "0%"
        }
        
        status = "CONSENSUS_REACHED" if approved else "CONSENSUS_FAILED"
        log_entry = self._create_log_entry("CONSENSUS", status, details)
        self.logs.append(log_entry)
        self._save_logs()
        
        print(f"{'✓' if approved else '✗'} LOG: Consenso {transaction_id[:8]}... ({total_approvals}/{total_peers}) [{status}]")
    
    def log_block(self, block_index: int, block_hash: str, 
                 transactions_count: int, status: str = "MINED") -> None:
        """
        Registra a criação de um novo bloco.
        
        Args:
            block_index: Índice do bloco
            block_hash: Hash do bloco
            transactions_count: Número de transações no bloco
            status: Status (MINED, ADDED, REJECTED)
        """
        details = {
            "block_index": block_index,
            "block_hash": block_hash,
            "transactions_count": transactions_count
        }
        
        log_entry = self._create_log_entry("BLOCK", status, details)
        self.logs.append(log_entry)
        self._save_logs()
        
        print(f"⛏️ LOG: Bloco #{block_index} minerado com {transactions_count} transação(ões) [{status}]")
    
    def log_peer_event(self, peer_address: str, event_type: str, 
                      details: Optional[Dict[str, Any]] = None) -> None:
        """
        Registra eventos de conexão de peers.
        
        Args:
            peer_address: Endereço do peer
            event_type: Tipo do evento (CONNECTED, DISCONNECTED, ERROR)
            details: Detalhes adicionais
        """
        log_details = {"peer_address": peer_address}
        
        if details:
            log_details.update(details)
        
        log_entry = self._create_log_entry("PEER", event_type, log_details)
        self.logs.append(log_entry)
        self._save_logs()
        
        emoji = "🔗" if event_type == "CONNECTED" else "🔌" if event_type == "DISCONNECTED" else "⚠️"
        print(f"{emoji} LOG: Peer {peer_address} [{event_type}]")
    
    def log_coin_operation(self, user: str, operation: str, 
                          coins_count: int, total_value: float,
                          details: Optional[Dict[str, Any]] = None) -> None:
        """
        Registra operações com moedas usando hash para identificação.
        
        Args:
            user: Usuário envolvido (será convertido para hash)
            operation: Tipo de operação (CREATE, TRANSFER, COMBINE, BREAK)
            coins_count: Quantidade de moedas envolvidas
            total_value: Valor total
            details: Detalhes adicionais
        """
        # Cria hash para ocultar identidade
        user_hash = self._create_user_hash(user)
        
        log_details = {
            "user_hash": user_hash,
            "operation": operation,
            "coins_count": coins_count,
            "total_value": total_value
        }
        
        # Se details contém sender/receiver, converte para hash também
        if details:
            sanitized_details = {}
            for key, value in details.items():
                if key in ['sender', 'receiver']:
                    # Converte para hash
                    sanitized_details[f"{key}_hash"] = self._create_user_hash(str(value))
                elif key not in ['user']:  # Remove referências diretas a usuários
                    sanitized_details[key] = value
            log_details.update(sanitized_details)
        
        log_entry = self._create_log_entry("COIN_OPERATION", operation, log_details)
        self.logs.append(log_entry)
        self._save_logs()
        
        print(f"💰 LOG: Operação de moeda - {operation} para {user_hash} ({coins_count} moedas, valor: {total_value})")
    
    def log_error(self, error_type: str, message: str, 
                 details: Optional[Dict[str, Any]] = None) -> None:
        """
        Registra erros do sistema.
        
        Args:
            error_type: Tipo do erro
            message: Mensagem de erro
            details: Detalhes adicionais
        """
        log_details = {
            "error_type": error_type,
            "message": message
        }
        
        if details:
            log_details.update(details)
        
        log_entry = self._create_log_entry("ERROR", "FAILED", log_details)
        self.logs.append(log_entry)
        self._save_logs()
        
        print(f"❌ LOG: Erro - {error_type}: {message}")
    
    def get_logs(self, log_type: Optional[str] = None, 
                status: Optional[str] = None,
                limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Recupera logs filtrados.
        
        Args:
            log_type: Filtrar por tipo (TRANSACTION, VALIDATION, etc.)
            status: Filtrar por status
            limit: Limitar número de resultados
        
        Returns:
            Lista de logs filtrados
        """
        filtered_logs = self.logs
        
        if log_type:
            filtered_logs = [log for log in filtered_logs if log["type"] == log_type]
        
        if status:
            filtered_logs = [log for log in filtered_logs if log["status"] == status]
        
        if limit:
            filtered_logs = filtered_logs[-limit:]
        
        return filtered_logs
    
    def get_transaction_history(self, user: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Recupera histórico de transações de um usuário usando hash.
        
        Args:
            user: Nome do usuário (será convertido para hash)
            limit: Limitar número de resultados
        
        Returns:
            Lista de transações do usuário
        """
        # Converte o usuário para hash
        user_hash = self._create_user_hash(user)
        
        transactions = [
            log for log in self.logs 
            if log["type"] == "TRANSACTION" and 
            (log["details"].get("sender_hash") == user_hash or 
             log["details"].get("receiver_hash") == user_hash)
        ]
        
        if limit:
            transactions = transactions[-limit:]
        
        return transactions
    
    def clear_logs(self) -> None:
        """Limpa todos os logs (usar com cuidado!)"""
        self.logs = []
        self._save_logs()
        print("🗑️ Todos os logs foram limpos")
    
    def export_logs(self, filename: str) -> bool:
        """
        Exporta logs para um arquivo diferente.
        
        Args:
            filename: Nome do arquivo de destino
        
        Returns:
            True se exportado com sucesso
        """
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.logs, f, indent=4, ensure_ascii=False)
            print(f"📤 Logs exportados para {filename}")
            return True
        except IOError as e:
            print(f"❌ Erro ao exportar logs: {e}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Retorna estatísticas sobre os logs.
        
        Returns:
            Dicionário com estatísticas
        """
        total_logs = len(self.logs)
        
        if total_logs == 0:
            return {"message": "Nenhum log registrado"}
        
        # Conta por tipo
        types_count = {}
        status_count = {}
        
        for log in self.logs:
            log_type = log["type"]
            log_status = log["status"]
            
            types_count[log_type] = types_count.get(log_type, 0) + 1
            status_count[log_status] = status_count.get(log_status, 0) + 1
        
        # Transações
        transactions = [log for log in self.logs if log["type"] == "TRANSACTION"]
        successful_txs = len([tx for tx in transactions if tx["status"] == "SUCCESS"])
        failed_txs = len([tx for tx in transactions if tx["status"] == "FAILED"])
        
        return {
            "total_logs": total_logs,
            "logs_by_type": types_count,
            "logs_by_status": status_count,
            "transactions": {
                "total": len(transactions),
                "successful": successful_txs,
                "failed": failed_txs,
                "success_rate": f"{(successful_txs/len(transactions)*100):.1f}%" if transactions else "0%"
            },
            "first_log": self.logs[0]["timestamp"] if self.logs else None,
            "last_log": self.logs[-1]["timestamp"] if self.logs else None
        }


# Exemplo de uso
if __name__ == "__main__":
    # Inicializa o logger
    logger = Logger(node_id="ws://127.0.0.1:8770")
    
    # Registra alguns eventos de exemplo
    logger.log_transaction("user1", "user2", 10.5, "SUCCESS", "tx-123")
    logger.log_validation("tx-123", "ws://127.0.0.1:8771", True, "Saldo suficiente")
    logger.log_consensus("tx-123", 3, 3, True)
    logger.log_block(1, "abc123def456", 1, "MINED")
    
    # Exibe estatísticas
    stats = logger.get_statistics()
    print("\n📊 Estatísticas dos Logs:")
    print(json.dumps(stats, indent=2, ensure_ascii=False))
