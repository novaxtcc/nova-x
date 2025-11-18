/**
 * ============================================
 * SISTEMA DE TERMOS E CADASTRO DE SENHA NVX
 * CORREÇÃO FINAL - FUNÇÕES GLOBAIS PRIMEIRO  
 * ============================================
 */

// ===== FUNÇÕES GLOBAIS DEVEM ESTAR FORA DA IIFE =====
function solicitarCadastroPIN(delay = 0) {
    if (!window.NovaXPin || typeof window.NovaXPin.ensurePinSetup !== 'function') {
        return;
    }

    const pinJaCadastrado = typeof window.NovaXPin.hasPin === 'function'
        ? window.NovaXPin.hasPin()
        : false;

    if (pinJaCadastrado) {
        return;
    }

    const setupAberto = typeof window.NovaXPin.isSetupOpen === 'function'
        ? window.NovaXPin.isSetupOpen()
        : false;

    if (setupAberto) {
        return;
    }

    const abrirModalPin = () => {
        try {
            window.NovaXPin.ensurePinSetup();
        } catch (error) {
            console.error('[NVX] Erro ao abrir cadastro de PIN:', error);
        }
    };

    if (delay > 0) {
        setTimeout(abrirModalPin, delay);
    } else {
        abrirModalPin();
    }
}

window.togglePasswordVisibility = function(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('name', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('name', 'eye');
    }
};

window.fecharTermosSemAceitar = function() {

    const modal = document.getElementById('nvxTermsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('❌ Modal de termos fechado SEM aceitar');
    }
    
    if (typeof window.NovaXLock !== 'undefined' && typeof window.NovaXLock.lockDashboard === 'function') {
        console.log('🔒 Bloqueando dashboard (termos não aceitos)');
        setTimeout(() => {
            window.NovaXLock.lockDashboard();
        }, 100);
    }
    solicitarCadastroPIN(200);
};

window.fecharCadastroSenhaSemAceitar = function() {
    const modal = document.getElementById('nvxPasswordSetupModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        document.body.style.overflow = 'auto';
        console.log('❌ Modal de senha fechado SEM cadastrar');
    }
    
    if (typeof window.NovaXLock !== 'undefined' && typeof window.NovaXLock.lockDashboard === 'function') {
        console.log('🔒 Bloqueando dashboard (senha não cadastrada)');
        setTimeout(() => {
            window.NovaXLock.lockDashboard();
        }, 100);
    }

    solicitarCadastroPIN(200)
};

window.aceitarTermosNVX = function() {
    const checkbox = document.getElementById('acceptTermsCheckbox');
    
    if (!checkbox || !checkbox.checked) {
        alert('Por favor, marque a caixa para aceitar os termos.');
        return;
    }
    
    localStorage.setItem('nvx_terms_accepted', 'true');
    console.log('✅ Termos aceitos!');
    
    const termsModal = document.getElementById('nvxTermsModal');
    if (termsModal) {
        termsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    abrirModalCadastroSenha();
};

window.atualizarForcaSenha = function() {
    const senha = document.getElementById('nvxNewPassword').value;
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const feedbackDiv = document.getElementById('passwordFeedback');
    
    if (!senha) {
        if (strengthDiv) strengthDiv.style.display = 'none';
        return;
    }
    
    if (strengthDiv) strengthDiv.style.display = 'block';
    const { forca, feedback } = validarForcaSenha(senha);
    
    if (strengthBar) strengthBar.style.width = forca + '%';
    
    if (forca <= 40) {
        if (strengthBar) strengthBar.style.background = '#ff4444';
        if (strengthText) {
            strengthText.textContent = 'Fraca';
            strengthText.style.color = '#ff4444';
        }
    } else if (forca <= 60) {
        if (strengthBar) strengthBar.style.background = '#ffa500';
        if (strengthText) {
            strengthText.textContent = 'Média';
            strengthText.style.color = '#ffa500';
        }
    } else if (forca <= 80) {
        if (strengthBar) strengthBar.style.background = '#2196F3';
        if (strengthText) {
            strengthText.textContent = 'Boa';
            strengthText.style.color = '#2196F3';
        }
    } else {
        if (strengthBar) strengthBar.style.background = '#4CAF50';
        if (strengthText) {
            strengthText.textContent = 'Forte';
            strengthText.style.color = '#4CAF50';
        }
    }
    
    if (feedbackDiv) {
        if (feedback.length > 0) {
            feedbackDiv.innerHTML = '<small>Necessário: ' + feedback.join(', ') + '</small>';
            feedbackDiv.style.color = '#ff4444';
        } else {
            feedbackDiv.innerHTML = '<small>✓ Senha forte!</small>';
            feedbackDiv.style.color = '#4CAF50';
        }
    }
};

window.cadastrarSenhaNVX = async function() {
    const novaSenha = document.getElementById('nvxNewPassword').value;
    const confirmaSenha = document.getElementById('nvxConfirmPassword').value;
    const errorDiv = document.getElementById('passwordSetupError');
    const cpf = JSON.parse(localStorage.getItem("user")).cpf;
    
    if (errorDiv) errorDiv.style.display = 'none';
    
    if (!novaSenha || !confirmaSenha) {
        if (errorDiv) {
            errorDiv.textContent = 'Preencha todos os campos';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    const { forca, feedback } = validarForcaSenha(novaSenha);
    
    if (forca < 100) {
        if (errorDiv) {
            errorDiv.textContent = 'Senha não atende aos requisitos: ' + feedback.join(', ');
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (novaSenha !== confirmaSenha) {
        if (errorDiv) {
            errorDiv.textContent = 'As senhas não coincidem';
            errorDiv.style.display = 'block';
        }
        return;
    }

    try{
        const response = await fetch("http://localhost:3000/saveKey", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf
            })
        });

        const result = await response.json();
        if (result.success){
            console.log("Usuario blockchain adicionado")
            localStorage.setItem('nvx_blockchain_password', 1)
            window.document.getElementById('nvxPasswordSetupModal').style.display = "none"
        }
        else {
            console.log("Nao foi possivel adicionar usuario blockchain")
        }
    } catch(error){
        console.log("Erro ao processar membro blockchain:", error)
        // alert("Erro ao processar login")
    }
    
    // senhaHash = btoa(novaSenha)
    signBlockchain(novaSenha)
};

window.temSenhaNVX = function() {
    return localStorage.getItem('nvx_blockchain_password') !== null;
};

window.getSenhaNVX = function() {
    const senhaCriptografada = localStorage.getItem('nvx_blockchain_password');
    if (!senhaCriptografada) return null;
    return senhaCriptografada
};

window.termosForamAceitos = function() {
    return localStorage.getItem('nvx_terms_accepted') === 'true';
};

// ===== AGORA A IIFE COM FUNÇÕES INTERNAS =====
(function() {
    'use strict';

    const TERMS_ACCEPTED_KEY = 'nvx_terms_accepted';
    const NVX_PASSWORD_KEY = 'nvx_blockchain_password';

    function abrirModalCadastroSenha() {
        const modal = document.getElementById('nvxPasswordSetupModal');
        if (!modal) {
            console.error('❌ Modal de cadastro de senha não encontrado!');
            return;
        }
        
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('show'), 10);
        
        const newPassword = document.getElementById('nvxNewPassword');
        const confirmPassword = document.getElementById('nvxConfirmPassword');
        const errorDiv = document.getElementById('passwordSetupError');
        const strengthDiv = document.getElementById('passwordStrength');
        
        if (newPassword) newPassword.value = '';
        if (confirmPassword) confirmPassword.value = '';
        if (errorDiv) errorDiv.style.display = 'none';
        if (strengthDiv) strengthDiv.style.display = 'none';
        
        console.log('🔐 Modal de cadastro de senha aberto');
    }

    function validarForcaSenha(senha) {
        let forca = 0;
        const feedback = [];
        
        if (senha.length >= 8) {
            forca += 20;
        } else {
            feedback.push('Mínimo 8 caracteres');
        }
        
        if (/[a-z]/.test(senha)) {
            forca += 20;
        } else {
            feedback.push('Letra minúscula');
        }
        
        if (/[A-Z]/.test(senha)) {
            forca += 20;
        } else {
            feedback.push('Letra maiúscula');
        }
        
        if (/[0-9]/.test(senha)) {
            forca += 20;
        } else {
            feedback.push('Número');
        }
        
        if (/[^a-zA-Z0-9]/.test(senha)) {
            forca += 20;
        } else {
            feedback.push('Caractere especial (!@#$%&*)');
        }
        
        return { forca, feedback };
    }

    function configurarCheckbox() {
        const checkbox = document.getElementById('acceptTermsCheckbox');
        const acceptBtn = document.getElementById('acceptTermsBtn');
        
        if (checkbox && acceptBtn) {
            checkbox.addEventListener('change', function() {
                acceptBtn.disabled = !this.checked;
            });
        }
    }

    function verificarEMostrarTermos() {
        const termosAceitos = localStorage.getItem(TERMS_ACCEPTED_KEY) === 'true';
        const senhaConfigurada = localStorage.getItem(NVX_PASSWORD_KEY);
        const pinConfigurado = (typeof window.NovaXPin !== 'undefined' && typeof window.NovaXPin.hasPin === 'function')
            ? window.NovaXPin.hasPin()
            : false;
        
        console.log('🔍 Verificação inicial:', {
            termosAceitos,
            senhaConfigurada: !!senhaConfigurada,
            pinConfigurado
        });
        
        if (!termosAceitos && !senhaConfigurada) {
            const modal = document.getElementById('nvxTermsModal');
            if (modal) {
                console.log('📋 Mostrando modal de termos...');
                modal.style.display = 'block';
                setTimeout(() => modal.classList.add('show'), 10);
                document.body.style.overflow = 'hidden';
                
                if (typeof window.NovaXLock !== 'undefined' && typeof window.NovaXLock.lockDashboard === 'function') {
                    console.log('🔒 Bloqueando dashboard (termos não aceitos)');
                    setTimeout(() => {
                        window.NovaXLock.lockDashboard();
                    }, 500);
                }
            } else {
                console.error('❌ Modal de termos não encontrado no HTML!');
            }
        }
        else if (termosAceitos && !senhaConfigurada) {
            console.log('🔐 Termos aceitos - abrindo modal de senha...');
            setTimeout(() => {
                abrirModalCadastroSenha();
                if (typeof window.NovaXLock !== 'undefined' && typeof window.NovaXLock.lockDashboard === 'function') {
                    setTimeout(() => {
                        window.NovaXLock.lockDashboard();
                    }, 200);
                }
            }, 500);
        }
        else if (!pinConfigurado) {
            console.log('[NVX] PIN nao configurado - solicitando cadastro...');
            solicitarCadastroPIN(500);
        }
        else {
            console.log('✅ Termos e senha já configurados');
            document.body.style.overflow = 'auto';
        }
    }

    // Expor função para uso global
    window.abrirModalCadastroSenha = abrirModalCadastroSenha;
    window.validarForcaSenha = validarForcaSenha;

    // Inicialização
    setTimeout(() => {
        configurarCheckbox();
        verificarEMostrarTermos();
        console.log('🔍 Sistema de Termos NVX inicializado - OLHOS FUNCIONANDO!');
    }, 1500);

})();
