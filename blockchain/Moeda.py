# import hashlib
# import json

# class Moeda:
#     def __init__(self, previous_hash:str, hash:str, user_id:str):
#         self.value = 1
#         self.user_id = user_id
#         self.previous_hash = previous_hash
#         self.hash = hash
#         self.next_hash = self.calculate_hash()

#     # Método para calcular o hash da moeda
#     def calculate_hash(self):
#         block_string = json.dumps(self.__dict__, sort_keys=True)
#         return hashlib.sha256(block_string.encode()).hexdigest()

#     def break_coin(self, moeda, valor):
#         moeda["valor"] -= valor
#         return moeda


import hashlib
import json
from typing import List, Tuple, Optional

class Moeda:
    def __init__(self, previous_hash: str, hash: str, user_id: str, next_hash: str = None, value: float = 1.0, **kwargs):
        if user_id == "kwargs":
            self.user_id = kwargs["user_id"]
            self.previous_hash = kwargs["previous_hash"]
            self.hash = kwargs["hash"]
            self.next_hash = kwargs["next_hash"]
            self.value = kwargs["value"]
        else:
            self.value = value
            self.user_id = user_id
            self.previous_hash = previous_hash
            self.hash = hash
            self.next_hash = next_hash or self.calculate_hash()

    # Método para calcular o hash da moeda
    def calculate_hash(self):
        # Criamos um dicionário temporário sem o next_hash para evitar recursão no cálculo
        temp_dict = {k: v for k, v in self.__dict__.items() if k != 'next_hash'}
        block_string = json.dumps(temp_dict, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def convert_coin(self):
        return self.__dict__

    @classmethod
    def create_new_coin(cls, user_id: str, last_coin: Optional['Moeda'] = None, value: float = 1.0):
        """
        Cria uma nova moeda seguindo as regras de hash.
        
        Args:
            user_id: ID do usuário dono da moeda
            last_coin: Última moeda criada no sistema (para pegar o next_hash)
            value: Valor da moeda (padrão: 1.0)
            
        Returns:
            Nova instância de Moeda
        """
        if last_coin:
            previous_hash = last_coin.hash
            hash_value = last_coin.next_hash
        else:
            # Se não há moeda anterior, é a primeira moeda do sistema
            previous_hash = "0"
            hash_value = hashlib.sha256(f"genesis-{user_id}".encode()).hexdigest()
            
        return cls(previous_hash=previous_hash, hash=hash_value, user_id=user_id, value=value)
    
    def update_previous_hash(self, new_hash):
        self.previous_hash = new_hash

    def break_coin(self, valor_quebrado: float) -> 'Moeda':
        """
        Quebra a moeda atual e retorna uma nova moeda com o valor fracionário.
        
        Args:
            valor_quebrado: Valor a ser separado da moeda atual
            
        Returns:
            Nova instância de Moeda com o valor quebrado
        """
        if valor_quebrado >= self.value or valor_quebrado <= 0:
            raise ValueError(f"Valor inválido para quebra de moeda. Valor atual: {self.value}, Valor solicitado: {valor_quebrado}")
            
        # Arredonda para evitar erros de precisão com float
        valor_quebrado = round(valor_quebrado, 8)
        
        # Reduz o valor da moeda atual
        self.value = round(self.value - valor_quebrado, 8)
        
        
        # Cria uma nova moeda com o valor quebrado
        nova_moeda = Moeda(
            previous_hash=self.hash,
            hash=self.calculate_hash(),  # Regra 2: hash da nova moeda = next_hash da anterior
            user_id=self.user_id,
            next_hash= self.next_hash,
            value=valor_quebrado
        )
        
        # Atualiza o hash da moeda atual após a modificação
        self.next_hash = nova_moeda.hash
        # Atualiza o next_hash da nova moeda
        # nova_moeda.next_hash = nova_moeda.calculate_hash()  # Regra 3
        
        return nova_moeda
    
    @staticmethod
    def combine_coins(moedas: List['Moeda'], all_user_coins: List['Moeda'] = None) -> Tuple[List['Moeda'], List['Moeda']]:
        """
        Combina moedas seguindo as regras:
        1. Valor máximo de 1 por moeda
        2. Verifica se o usuário já possui moedas quebradas que podem ser combinadas
        3. Destrua moedas antigas quando combinar
        4. Minimiza o número de moedas quebradas
        
        Args:
            moedas: Lista de moedas a serem combinadas
            all_user_coins: Todas as moedas do usuário (para verificar moedas quebradas)
            
        Returns:
            Tupla contendo (moedas_criadas, moedas_destruidas)
        """
        if not moedas:
            return [], []
            
        user_id = moedas[0].user_id
        
        # Verifica se todas as moedas pertencem ao mesmo usuário
        if not all(moeda.user_id == user_id for moeda in moedas):
            raise ValueError("Todas as moedas devem pertencer ao mesmo usuário")
        
        # Inicializa a lista de todas as moedas quebradas do usuário
        moedas_quebradas = []
        
        # Adiciona as moedas que vieram como parâmetro
        for moeda in moedas:
            if moeda.value < 1.0:
                moedas_quebradas.append(moeda)
        
        # Se all_user_coins foi fornecido, verifica outras moedas quebradas do usuário
        if all_user_coins:
            for moeda in all_user_coins:
                if moeda.value < 1.0 and moeda.user_id == user_id and moeda not in moedas:
                    moedas_quebradas.append(moeda)
        
        # Ordena as moedas quebradas pelo valor (do maior para o menor)
        moedas_quebradas.sort(key=lambda m: m.value, reverse=True)
        
        moedas_criadas = []
        moedas_destruidas = []
        moedas_atualizar = []
        
        # Enquanto tiver pelo menos duas moedas quebradas
        while len(moedas_quebradas) >= 2:
            # Pega a maior e a menor moeda
            maior = moedas_quebradas[0]
            menor = moedas_quebradas[-1]
            
            soma = round(maior.value + menor.value, 8)
            
            # Se a soma é menor ou igual a 1, combina as duas moedas
            if soma <= 1.0:
                # Remove as duas moedas
                if soma == 1.0:
                    moedas_quebradas.pop(0)
                moedas_quebradas.pop(-1)
                
                # Adiciona às moedas destruídas
                moedas_destruidas.extend([menor])
                
                # Cria uma nova moeda com o valor combinado
                maior.value = soma
                
                moedas_atualizar.append({"hash": menor.previous_hash, "update": menor.next_hash, "range": "next"})
                moedas_atualizar.append({"hash": menor.next_hash, "update": menor.previous_hash, "range": "previous"})
                
                # Atualiza o next_hash
                # nova_moeda.next_hash = nova_moeda.calculate_hash()
                
                # Adiciona a nova moeda à lista
                # moedas_criadas.append(nova_moeda)
                
                # Reordena a lista
                moedas_quebradas.sort(key=lambda m: m.value, reverse=True)
            else:
                # Se a soma é maior que 1, cria uma moeda de valor 1 e outra com o resto
                resto = round(soma - 1.0, 8)
                
                # Remove as duas moedas
                moedas_quebradas.pop(0)
                # moedas_quebradas.pop(-1)
                
                # Adiciona às moedas destruídas
                # moedas_destruidas.extend([maior, menor])
                
                # Cria uma nova moeda com valor 1
                # moeda_inteira = Moeda(
                #     previous_hash=f"{maior.hash}-{menor.hash}-inteira",
                #     hash=hashlib.sha256(f"{maior.hash}-{menor.hash}-inteira".encode()).hexdigest(),
                #     user_id=user_id,
                #     value=1.0
                # )
                
                maior.value = 1.0
                menor.value = resto
                
                # Atualiza o next_hash
                # moeda_inteira.next_hash = moeda_inteira.calculate_hash()
                
                # # Cria uma nova moeda com o resto
                # moeda_resto = Moeda(
                #     previous_hash=moeda_inteira.hash,
                #     hash=moeda_inteira.next_hash,
                #     user_id=user_id,
                #     value=resto
                # )
                
                # Atualiza o next_hash
                # moeda_resto.next_hash = moeda_resto.calculate_hash()
                
                # # Adiciona as novas moedas à lista
                # moedas_criadas.append(moeda_inteira)
                # moedas_criadas.append(moeda_resto)
                
                # # Adiciona a moeda de resto de volta às moedas quebradas
                # moedas_quebradas.append(moeda_resto)
                
                # Reordena a lista
                moedas_quebradas.sort(key=lambda m: m.value, reverse=True)
        
        # Retorna as moedas criadas e destruídas
        return moedas_criadas, moedas_destruidas
    
    @staticmethod
    def calculate_transfer(moedas: List['Moeda'], valor_transferencia: float) -> Tuple[List['Moeda'], List['Moeda'], List['Moeda']]:
        """
        Calcula quais moedas usar para uma transferência e já faz a quebra quando necessário.
        
        Args:
            moedas: Lista de moedas disponíveis
            valor_transferencia: Valor total a ser transferido
            
        Returns:
            Tupla contendo (moedas_usadas, moedas_quebradas, moedas_criadas)
        """
        if valor_transferencia <= 0:
            raise ValueError("Valor de transferência deve ser maior que zero")
            
        # Arredonda para evitar erros de precisão com float
        valor_transferencia = round(valor_transferencia, 8)
            
        # Verifica se há saldo suficiente
        valor_total_disponivel = sum(moeda.value for moeda in moedas)
        if valor_total_disponivel < valor_transferencia:
            raise ValueError(f"Saldo insuficiente para a transferência. Disponível: {valor_total_disponivel}, Necessário: {valor_transferencia}")
        
        # Ordena moedas do maior valor para o menor
        moedas_ordenadas = sorted(moedas, key=lambda moeda: moeda.value, reverse=True)
        
        moedas_a_usar = []
        moedas_quebradas = []
        moedas_criadas = []
        moedas_atualizar = []
        valor_restante = valor_transferencia
        
        # Primeiro tenta usar moedas completas ou quebradas que caibam exatamente
        for moeda in moedas_ordenadas:
            if moeda.value <= valor_restante:
                moedas_a_usar.append(moeda)
                valor_restante = round(valor_restante - moeda.value, 8)
                if valor_restante == 0:
                    break
        
        # Se ainda há valor restante, quebra a moeda necessária
        if valor_restante > 0:
            for moeda in moedas_ordenadas:
                if moeda not in moedas_a_usar and moeda.value > valor_restante:
                    # Adiciona moeda original à lista de quebradas
                    moedas_quebradas.append(moeda)
                    
                    # Quebra a moeda
                    nova_moeda = moeda.break_coin(valor_restante)
                    
                    moedas_atualizar.append({"moeda": nova_moeda.next_hash, "hash_update": nova_moeda.hash})
                    
                    # Adiciona nova moeda à lista de criadas
                    moedas_criadas.append(nova_moeda)
                    
                    # Adiciona nova moeda à lista de usadas
                    moedas_a_usar.append(nova_moeda)
                    
                    valor_restante = 0
                    break
        
        return moedas_a_usar, moedas_quebradas, moedas_criadas, moedas_atualizar
    
# if __name__ == "__main__":
#     moeda = Moeda("0", "hash", "system", "nextHash", 1.0)
#     print(moeda.__dict__)
#     moeda2 = moeda.convert_coin()
#     print(Moeda(moeda2['previous_hash'], moeda2['hash'], moeda2['user_id'], moeda2['next_hash'], moeda2['value']).__dict__)