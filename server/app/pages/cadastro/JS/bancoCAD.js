    var nome           
    var email          
    var telefone       
    var cpf            
    var genero         
    var data_nascimento
    var cep            
    var numero         
    var complemento    
    var estado         
    var cidade         
    var logradouro     
    var senha          
    var confirmar_senha
    $(document).ready(function () {
        $('#telefone').mask('(00) 00000-0000');
        $('#cpf').mask('000.000.000-00');
        $('#cep').mask('00000-000');
    });

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("formulario");

        form.addEventListener("submit", async (event) => {
            event.preventDefault(); // impede recarregar a página

            senha           = document.getElementById("senha").value;
            confirmar_senha = document.getElementById("confirmar_senha").value;

            // Validar senhas
            if (senha !== confirmar_senha) {
                document.getElementById("erro-senha").style.display = "block";
                return;
            } else {
                document.getElementById("erro-senha").style.display = "none";
            }

            // Validar requisitos da senha
            if (!validarSenha(senha)) {
                document.getElementById("erro-requisitos").style.display = "block";
                return;
            } else {
                document.getElementById("erro-requisitos").style.display = "none";
            }

            try {
                const response = await fetch("http://localhost:3000/cadastro", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true"
                    },
                    body: JSON.stringify({
                        nome,
                        email,
                        telefone,
                        cpf,
                        genero,
                        data_nascimento,
                        cep,
                        numero,
                        complemento,
                        estado,
                        cidade,
                        logradouro,
                        senha
                    })
                });

                const result = await response.json();
                console.log("Resposta do servidor:", result);
                alert(result.message);
                
                // Limpar formulário e voltar à primeira etapa em caso de sucesso
                if (response.ok) {
                    form.reset();
                    voltarPrimeiraEtapa();
                }
            } catch (error) {
                console.error("Erro ao cadastrar:", error);
                alert("Erro ao cadastrar usuário.");
            }
        });
    });

    async function buscarCEP(cep) {
        cep = cep.replace(/\D/g, '');
        if (cep.length !== 8) return;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (data.erro) {
                alert('CEP não encontrado!');
                return;
            }
            $('#logradouro').val(data.logradouro);
            $('#cidade').val(data.localidade);
            $('#estado').val(data.uf);
        } catch (e) {
            console.error(e);
        }
    }
    $('#cep').on('blur', function () {
        buscarCEP(this.value);
    });

    function mostrarSegundaEtapa() {
          // Coletar TODOS os dados do formulário
        nome            = document.getElementById("nome").value;
        email           = document.getElementById("email").value;
        telefone        = document.getElementById("telefone").value;
        cpf             = document.getElementById("cpf").value;
        genero          = document.getElementById("genero").value;
        data_nascimento = document.getElementById("data_nascimento").value;
        cep             = document.getElementById("cep").value;
        numero          = document.getElementById("numero").value;
        complemento     = document.getElementById("complemento").value;
        estado          = document.getElementById("estado").value;
        cidade          = document.getElementById("cidade").value;
        logradouro      = document.getElementById("logradouro").value;

        if (!nome || !email || !telefone || !cpf || !data_nascimento || !cep || !numero || !genero) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        if (!validarCPF(cpf)) {
            $('#erro-cpf').show();
            return;
        } else {
            $('#erro-cpf').hide();
        }
        if (!validarTelefone(telefone)) {
            $('#erro-telefone').show();
            return;
        } else {
            $('#erro-telefone').hide();
        }
        if (calcularIdade(data_nascimento) < 18) {
            alert('Você precisa ter pelo menos 18 anos.');
            return;
        }

        const numeroInput = document.getElementById('numero');
        if (!numeroInput.checkValidity()) {
            alert(numeroInput.title);
            return;
        }

        trocarEtapa('primeira-etapa', 'segunda-etapa');
    }

    function voltarPrimeiraEtapa() {
        trocarEtapa('segunda-etapa', 'primeira-etapa');
    }

    function trocarEtapa(atualId, proximaId) {
        const atual = document.getElementById(atualId);
        const proxima = document.getElementById(proximaId);
        
        // Remove a classe 'ativa' do atual
        atual.classList.remove('ativa');
        
        // Aguarda a transição e troca
        setTimeout(() => {
            atual.style.display = 'none';
            proxima.style.display = 'block';
            // Pequeno delay para garantir que o display foi aplicado
            setTimeout(() => {
                proxima.classList.add('ativa');
            }, 50); // Reduzido de 3000 para 50ms
        }, 300); // Reduzido de 3000 para 300ms
    }

    function togglePasswordVisibility(id) {
        var input = document.getElementById(id),
            eye = document.getElementById('eye-icon-' + id);
        if (input.type === 'password') {
            input.type = 'text';
            eye.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            eye.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }

    function validarCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let soma = 0,
            mult = 10;
        for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * mult--;
        let resto = soma % 11;
        let dig1 = resto < 2 ? 0 : 11 - resto;
        if (parseInt(cpf.charAt(9)) !== dig1) return false;

        soma = 0;
        mult = 11;
        for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * mult--;
        resto = soma % 11;
        let dig2 = resto < 2 ? 0 : 11 - resto;
        if (parseInt(cpf.charAt(10)) !== dig2) return false;

        return true;
    }

    function validarTelefone(telefone) {
        return /^\(\d{2}\) \d{4,5}-\d{4}$/.test(telefone);
    }

    function validarSenha(senha) {
        // Senha deve ter pelo menos 8 caracteres, maiúscula, minúscula, número e caractere especial
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(senha);
    }

    function calcularIdade(data) {
        const hoje = new Date();
        const nascimento = new Date(data);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    }