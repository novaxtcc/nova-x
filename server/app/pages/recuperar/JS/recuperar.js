// ================================================
// SISTEMA DE RECUPERAÇÃO DE SENHA
// Com Twilio Verify e notificações modernas
// ================================================

// Base de usuários para teste (CPF como chave)
var cpf = ""

// Variável global que armazenará o código de verificação gerado
let codigoGerado = "";
let dadosUsuarioAtual = null;
let metodoEnvio = ""; // Armazena se foi email ou sms
let intervaloContador = null; // Para o contador de tempo

// ===== SISTEMA DE NOTIFICAÇÕES MODERNAS =====

function mostrarNotificacao(mensagem, tipo = 'info', duracao = 4000) {
    const notifAnterior = document.querySelector('.notificacao-moderna');
    if (notifAnterior) {
        notifAnterior.remove();
    }
    
    const config = {
        sucesso: {
            icone: '✓',
            cor: '#ffffff',
            corIcone: '#10b981',
            corFundo: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            corBorda: '#10b981',
            sombra: '0 10px 40px rgba(16, 185, 129, 0.3)'
        },
        erro: {
            icone: '✕',
            cor: '#ffffff',
            corIcone: '#ef4444',
            corFundo: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            corBorda: '#ef4444',
            sombra: '0 10px 40px rgba(239, 68, 68, 0.3)'
        },
        aviso: {
            icone: '⚠',
            cor: '#ffffff',
            corIcone: '#f59e0b',
            corFundo: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            corBorda: '#f59e0b',
            sombra: '0 10px 40px rgba(245, 158, 11, 0.3)'
        },
        info: {
            icone: 'ℹ',
            cor: '#ffffff',
            corIcone: '#3b82f6',
            corFundo: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            corBorda: '#3b82f6',
            sombra: '0 10px 40px rgba(59, 130, 246, 0.3)'
        }
    };
    
    const estilo = config[tipo] || config.info;
    
    const notificacao = document.createElement('div');
    notificacao.className = 'notificacao-moderna';
    notificacao.innerHTML = `
        <div class="notificacao-icone" style="color: ${estilo.cor}">
            ${estilo.icone}
        </div>
        <div class="notificacao-texto">${mensagem}</div>
    `;
    
    Object.assign(notificacao.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%) translateY(-100px)',
        background: estilo.corFundo,
        border: 'none',
        borderRadius: '16px',
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '320px',
        maxWidth: '500px',
        boxShadow: estilo.sombra,
        zIndex: '10000',
        transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        opacity: '0'
    });
    
    const icone = notificacao.querySelector('.notificacao-icone');
    Object.assign(icone.style, {
        fontSize: '28px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.25)',
        flexShrink: '0',
        backdropFilter: 'blur(10px)'
    });
    
    const texto = notificacao.querySelector('.notificacao-texto');
    Object.assign(texto.style, {
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: '600',
        lineHeight: '1.5',
        flex: '1',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    });
    
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.style.transform = 'translateX(-50%) translateY(0)';
        notificacao.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        notificacao.style.transform = 'translateX(-50%) translateY(-100px)';
        notificacao.style.opacity = '0';
        setTimeout(() => notificacao.remove(), 400);
    }, duracao);
}

// ===== FUNÇÕES DE MASCARAMENTO =====

function mascararEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [nome, dominio] = email.split('@');
    const caracteresVisiveis = Math.min(3, nome.length);
    const parteVisivel = nome.substring(0, caracteresVisiveis);
    const parteOculta = '*'.repeat(Math.max(3, nome.length - caracteresVisiveis));
    return `${parteVisivel}${parteOculta}@${dominio}`;
}

function mascararTelefone(telefone) {
    if (!telefone) return telefone;
    const numeros = telefone.replace(/\D/g, '');
    let tel = numeros;
    if (tel.startsWith('55') && tel.length > 11) {
        tel = tel.substring(2);
    }
    if (tel.length >= 10) {
        const ddd = tel.substring(0, 2);
        const ultimosDigitos = tel.slice(-4);
        return `(${ddd}) 9****-${ultimosDigitos}`;
    }
    return telefone.replace(/\d(?=\d{4})/g, '*');
}

// ===== FUNÇÕES PRINCIPAIS =====

function mascaraCPF(campo) {
    let cpf = campo.value.replace(/\D/g, ''); 
    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2"); 
    cpf = cpf.replace(/(\d{3})(\d)/, "$1.$2"); 
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); 
    campo.value = cpf;
}

function trocarEtapa(atual, proxima) {
    const elemAtual = document.getElementById(atual); 
    const elemProx = document.getElementById(proxima); 

    elemAtual.classList.remove('ativa');
    setTimeout(() => {
        elemAtual.style.display = 'none';
        elemProx.style.display = 'block'; 
        setTimeout(() => {
            elemProx.classList.add('ativa'); 
        }, 50); 
    }, 300); 
}

async function validarCPF() {
    cpf = document.getElementById("cpf").value; 
    try{
        const response = await fetch("/validaCPF", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf
            })
        });

        dadosUsuarioAtual = await response.json();

        if (dadosUsuarioAtual) {
        
            const emailMascarado = mascararEmail(dadosUsuarioAtual.email);
            const telefoneMascarado = mascararTelefone(dadosUsuarioAtual.telefone);
            
            document.getElementById("email").innerText = emailMascarado;
            document.getElementById("telefone").innerText = telefoneMascarado;
            
            console.log('✅ Email mascarado:', emailMascarado);
            console.log('✅ Telefone mascarado:', telefoneMascarado);
            
            trocarEtapa('etapa1', 'etapa2');
        } else {
            mostrarNotificacao('CPF não encontrado! Verifique e tente novamente.', 'erro');
        }
        
    } catch(error){
        console.log("Erro ao processar CPF:", error)
        mostrarNotificacao('Erro ao processar CPF! Verifique e tente novamente.', 'erro');
    }

}

async function enviarCodigo() {
    const metodo = document.getElementById("metodo").value;
    const botao = event.target;
    
    if (!dadosUsuarioAtual) {
        mostrarNotificacao('Erro: dados do usuário não encontrados', 'erro');
        return;
    }
    
    botao.disabled = true;
    const textoOriginal = botao.innerHTML;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    
    // Armazena o método para usar na verificação
    metodoEnvio = metodo;
    
    try {
        let resultado;
        
        if (metodo === 'email') {
            // Para email, geramos o código
            codigoGerado = Math.floor(100000 + Math.random() * 900000).toString();
            
            resultado = await enviarEmailVerificacao(
                dadosUsuarioAtual.email, 
                codigoGerado
            );
        } else if (metodo === 'sms') {
            // Para SMS, o Twilio Verify gera o código automaticamente
            codigoGerado = ""; // Não controlamos o código do Twilio Verify
            
            resultado = await enviarSMSVerificacao(
                dadosUsuarioAtual.telefone, 
                "" // Código não é usado pelo Twilio Verify
            );
        }
        
        if (resultado && resultado.sucesso) {
            const destino = metodo === 'email' ? 'seu email' : 'seu celular';
            mostrarNotificacao(`✅ Código enviado! Confira ${destino}.`, 'sucesso', 5000);
            trocarEtapa('etapa2', 'etapa3');
            iniciarContador(300); // 5 minutos
        } else {
            throw new Error(resultado.mensagem || 'Erro ao enviar código');
        }
        
    } catch (erro) {
        console.error('Erro:', erro);
        mostrarNotificacao('❌ Erro ao enviar código. Tente novamente.', 'erro');
    } finally {
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
}

// ⏱️ SISTEMA DE CONTADOR DE TEMPO (5 minutos)
function iniciarContador(segundos) {
    // Parar contador anterior se existir
    pararContador();
    
    let tempoRestante = segundos;
    const elementoContador = document.getElementById('contador-tempo');
    
    if (!elementoContador) {
        // Criar elemento do contador se não existir
        const contador = document.createElement('div');
        contador.id = 'contador-tempo';
        contador.style.cssText = 'text-align: center; color: #666; font-size: 14px; margin-top: 10px;';
        
        const etapa3 = document.getElementById('etapa3');
        const btnVerificar = etapa3.querySelector('button[onclick="verificarCodigo()"]');
        if (btnVerificar) {
            btnVerificar.parentNode.insertBefore(contador, btnVerificar.nextSibling);
        }
    }
    
    // Atualizar contador a cada segundo
    intervaloContador = setInterval(() => {
        const minutos = Math.floor(tempoRestante / 60);
        const segs = tempoRestante % 60;
        
        const elemento = document.getElementById('contador-tempo');
        if (elemento) {
            elemento.innerHTML = 
                `⏱️ Código expira em: <strong>${minutos}:${segs.toString().padStart(2, '0')}</strong>`;
        }
        
        console.log(`⏱️ Código expira em: ${minutos}:${segs.toString().padStart(2, '0')}`);
        
        if (tempoRestante <= 0) {
            pararContador();
            if (elemento) {
                elemento.innerHTML = 
                    '⏰ <span style="color: red;">Código expirado! Solicite um novo.</span>';
            }
            console.log('⏰ Código expirado!');
            codigoGerado = "";
        }
        
        tempoRestante--;
    }, 1000);
}

function pararContador() {
    if (intervaloContador) {
        clearInterval(intervaloContador);
        intervaloContador = null;
    }
}

async function verificarCodigo() {
    const codigo = document.getElementById("codigoRecebido").value;
    
    if (!codigo) {
        mostrarNotificacao('Digite o código recebido!', 'aviso');
        return;
    }
    
    const botao = event.target;
    botao.disabled = true;
    const textoOriginal = botao.innerHTML;
    botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    
    try {
        // Se foi SMS com Twilio Verify, usa a função de verificação do Twilio
        if (metodoEnvio === 'sms' && typeof verificarCodigoSMS === 'function') {
            const resultado = await verificarCodigoSMS(dadosUsuarioAtual.telefone, codigo);
            
            if (resultado.sucesso) {
                pararContador();
                mostrarNotificacao('✅ Código verificado com sucesso!', 'sucesso');
                trocarEtapa('etapa3', 'etapa4');
            } else {
                mostrarNotificacao('❌ Código incorreto ou expirado.', 'erro');
            }
        } 
        // Se foi email ou modo desenvolvimento, verifica localmente
        else {
            if (!codigoGerado) {
                mostrarNotificacao('⏰ Código expirado! Solicite um novo.', 'aviso');
                return;
            }
            
            if (codigo === codigoGerado) {
                pararContador();
                mostrarNotificacao('✅ Código verificado com sucesso!', 'sucesso');
                trocarEtapa('etapa3', 'etapa4');
            } else {
                mostrarNotificacao('❌ Código incorreto. Tente novamente.', 'erro');
            }
        }
    } catch (erro) {
        console.error('Erro ao verificar código:', erro);
        mostrarNotificacao('❌ Erro ao verificar código. Tente novamente.', 'erro');
    } finally {
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
}

// 🎯 REENVIAR CÓDIGO
async function reenviarCodigo() {
    pararContador();
    mostrarNotificacao('📤 Reenviando código...', 'info', 2000);
    
    // Simular clique no botão enviar
    const metodo = document.getElementById("metodo").value;
    metodoEnvio = metodo;
    
    const botao = document.querySelector('#etapa3 button[onclick="verificarCodigo()"]');
    await enviarCodigo();
}

function togglePassword(id, icon) {
    const campo = document.getElementById(id);
    if (campo.type === "password") {
        campo.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        campo.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

function validarSenha(senha) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/; 
    return regex.test(senha);
}

async function finalizar() {
    const novaSenha = document.getElementById("novaSenha").value;
    const confirmaSenha = document.getElementById("confirmaSenha").value;

    if (!novaSenha || !confirmaSenha) {
        mostrarNotificacao('Preencha todos os campos!', 'aviso');
        return;
    }

    if (!validarSenha(novaSenha)) {
        mostrarNotificacao('A senha não atende aos requisitos de segurança!', 'erro', 6000);
        return;
    }

    if (novaSenha !== confirmaSenha) {
        mostrarNotificacao('As senhas não coincidem.', 'erro');
        return;
    }

    try{
        const response = await fetch("/updateSenha", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf, novaSenha
            })
        });

        const result = await response.json();
        if (result.message === "Senha alterada com sucesso!"){
            mostrarNotificacao('✅ Senha redefinida com sucesso! Redirecionando...', 'sucesso', 3000);
            setTimeout(() => {
                window.location.href = '../index/index.html';
            }, 1500);
        }
        else {
            mostrarNotificacao('Falha ao atualizar senha! Redirecionando...', 'erro', 3000)
            setTimeout(() => {
                window.location.href = '../index/index.html';
            }, 1500);
        }
    } catch(error){
        console.log("Erro ao processar login:", error)
        alert("Erro ao processar login")
    }
}

function voltar(atual, anterior) {
    pararContador(); // Para o contador se voltar
    trocarEtapa(atual, anterior);
}

// ===== LOG INICIAL =====
console.log('🔐 Sistema de Recuperação carregado (Twilio Verify)');
console.log('📱 SMS via Twilio Verify ativado');
console.log('✅ Sistema pronto para uso!');