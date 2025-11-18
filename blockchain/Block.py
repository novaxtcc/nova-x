# Classe que representa um bloco na blockchain
import hashlib
import json
import time

class Block:
    def __init__(self, index, previous_hash, transactions, timestamp=None, hash=None):
        self.index = index  # Índice do bloco na cadeia
        self.previous_hash = previous_hash  # Hash do bloco anterior
        self.transactions = transactions  # Lista de transações contidas no bloco
        self.timestamp = timestamp or time.time()  # Registro de tempo do bloco
        self.hash = hash or self.calculate_hash()  # Cálculo do hash do bloco

    # Método para calcular o hash do bloco
    def calculate_hash(self):
        block_string = json.dumps(self.__dict__, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()