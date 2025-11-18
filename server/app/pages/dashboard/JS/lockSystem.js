/**
 * ============================================
 * SISTEMA DE BLOQUEIO NOVA-X
 * ============================================*/

// ===== FUNÇÕES GLOBAIS PRIMEIRO =====
window.toggleUnlockPassword = function() {
    const passwordInput = document.getElementById('unlockBlockchainPassword');
    const eyeIcon = document.getElementById('unlockEyeIcon');
    
    console.log('toggleUnlockPassword chamada', { passwordInput, eyeIcon });
    
    if (!passwordInput || !eyeIcon) {
        console.error('Elementos não encontrados', { passwordInput, eyeIcon });
        return;
    }
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.setAttribute('name', 'eye-off');
        console.log('Senha revelada (unlockPassword)');
    } else {
        passwordInput.type = 'password';
        eyeIcon.setAttribute('name', 'eye');
        console.log('Senha oculta (unlockPassword)');
    }
};

window.togglePasswordVisibility = function(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    console.log('togglePasswordVisibility chamada', { inputId, iconId, input, icon });
    
    if (!input || !icon) {
        console.error('Elementos não encontrados', { input, icon });
        return;
    }
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('name', 'eye-off');
        console.log('Senha revelada:', inputId);
    } else {
        input.type = 'password';
        icon.setAttribute('name', 'eye');
        console.log('Senha oculta:', inputId);
    }
};

// ===== IIFE COM O RESTO DO CÓDIGO =====
(function() {
    'use strict';

    let isDashboardLocked = false;
    let autoLockTimeout = null;
    let activityMonitoringBound = false;
    const AUTO_LOCK_TIME = 2 * 60 * 1000;

    function injectLockSystem() {
        const style = document.createElement('style');
        style.textContent = `
            .nvx-blocked {
                opacity: 0.3 !important;
                pointer-events: none !important;
                cursor: not-allowed !important;
                position: relative;
            }

            .nvx-blocked::after {
                content: 'BLOQUEADO';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(244, 67, 54, 0.9);
                color: white;
                padding: 4px 12px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 700;
                z-index: 100;
            }

            .tab-btn.nvx-transfer-blocked {
                opacity: 0.3 !important;
                pointer-events: none !important;
                cursor: not-allowed !important;
                position: relative;
            }

            .tab-btn.nvx-transfer-blocked::after {
                content: 'BLOQUEADO';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(244, 67, 54, 0.9);
                color: white;
                padding: 4px 10px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: 700;
                z-index: 100;
                white-space: nowrap;
            }

            #sendNVXForm.nvx-form-blocked {
                opacity: 0.4;
                pointer-events: none;
                position: relative;
            }

            #sendNVXForm.nvx-form-blocked::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(244, 67, 54, 0.1);
                z-index: 5;
                border-radius: 12px;
            }

            /* FORÇAR CURSOR E CLICABILIDADE DOS OLHOS */
            .unlock-eye-icon {
                cursor: pointer !important;
                pointer-events: auto !important;
                z-index: 100 !important;
                user-select: none !important;
                -webkit-user-select: none !important;
            }

            .unlock-eye-icon:hover {
                opacity: 0.7 !important;
                transform: scale(1.1) !important;
                transition: all 0.2s ease !important;
            }

            /* Garantir que ion-icon dentro seja clicável */
            .unlock-eye-icon ion-icon,
            .unlock-eye-icon * {
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);

        // Modal de desbloqueio
        const unlockModal = document.createElement('div');
        unlockModal.id = 'unlockModal';
        unlockModal.className = 'unlock-modal';
          unlockModal.innerHTML = `
              <div class="unlock-modal-content">
                  <div class="modal-header">
                      <div class="modal-header-title">
                          <ion-icon name="lock-open" class="modal-icon"></ion-icon>
                        <h2>Desbloquear Nova-X Blockchain</h2>
                    </div>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                  <div class="modal-body">
                      <p class="unlock-info">
                          <ion-icon name="information-circle"></ion-icon>
                          Digite sua senha da blockchain Nova-X
                      </p>
                      <div class="form-group">
                          <label for="unlockBlockchainPassword">Senha da Blockchain</label>
                          <div class="unlock-password-container">
                              <input 
                                  type="password"
                                id="unlockBlockchainPassword"
                                placeholder="Digite sua senha da blockchain"
                                autocomplete="off">
                            <ion-icon 
                                name="eye"
                                class="unlock-eye-icon"
                                id="unlockEyeIcon"></ion-icon>
                        </div>
                    </div>
                    <div class="lock-error-message" id="unlockError"></div>
                    <button type="button" class="submit-btn">
                        <ion-icon name="lock-open"></ion-icon>
                        Desbloquear
                    </button>
                </div>
              </div>
          `;
          document.body.appendChild(unlockModal);

          // Modal de cadastro de senha
          if (!document.getElementById('nvxPasswordSetupModal')) {
            const passwordSetupModal = document.createElement('div');
            passwordSetupModal.id = 'nvxPasswordSetupModal';
            passwordSetupModal.className = 'unlock-modal';
            passwordSetupModal.innerHTML = `
                <div class="unlock-modal-content">
                    <div class="modal-header">
                        <div class="modal-header-title">
                            <ion-icon name="key" class="modal-icon"></ion-icon>
                            <h2>Cadastrar Senha da Blockchain</h2>
                        </div>
                        <button class="close-btn" type="button" onclick="fecharCadastroSenhaSemAceitar()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="unlock-info">
                            <ion-icon name="shield-checkmark"></ion-icon>
                            Crie uma senha exclusiva para proteger sua carteira blockchain
                        </p>
                        
                        <div class="form-group">
                            <label for="nvxNewPassword">Nova Senha</label>
                            <div class="unlock-password-container">
                                <input type="password" 
                                    id="nvxNewPassword" 
                                    placeholder="Digite uma senha forte"
                                    oninput="atualizarForcaSenha()"
                                    autocomplete="new-password">
                                <ion-icon name="eye" 
                                          class="unlock-eye-icon" 
                                          id="newPasswordEye"></ion-icon>
                            </div>
                        </div>

                        <div id="passwordStrength" class="password-strength" style="display: none;">
                            <div class="strength-bar-container">
                                <div class="strength-bar" id="strengthBar"></div>
                            </div>
                            <div class="strength-info">
                                <span id="strengthText">Fraca</span>
                                <span id="passwordFeedback"></span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="nvxConfirmPassword">Confirmar Senha</label>
                            <div class="unlock-password-container">
                                <input type="password" 
                                    id="nvxConfirmPassword" 
                                    placeholder="Digite a senha novamente"
                                    autocomplete="new-password">
                                <ion-icon name="eye" 
                                          class="unlock-eye-icon" 
                                          id="confirmPasswordEye"></ion-icon>
                            </div>
                        </div>

                        <div class="password-requirements">
                            <p><strong>Requisitos da senha:</strong></p>
                            <ul>
                                <li>Mínimo de 8 caracteres</li>
                                <li>Pelo menos 1 letra maiúscula</li>
                                <li>Pelo menos 1 letra minúscula</li>
                                <li>Pelo menos 1 número</li>
                                <li>Pelo menos 1 caractere especial (!@#$%&*)</li>
                            </ul>
                        </div>
                        
                        <div class="lock-error-message" id="passwordSetupError"></div>
                        
                        <button type="button" class="submit-btn" onclick="cadastrarSenhaNVX()">
                            <ion-icon name="checkmark-circle"></ion-icon>
                            Cadastrar Senha
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(passwordSetupModal);
        }

        // Botão de lock no menu
        const menuOpcoes = document.querySelector('.menu-opcoes');
        if (menuOpcoes && !document.getElementById('lockBtn')) {
            const lockBtn = document.createElement('a');
            lockBtn.href = '#';
            lockBtn.className = 'lock-btn-header';
            lockBtn.id = 'lockBtn';
            lockBtn.innerHTML = `
                <ion-icon name="lock-open" id="lockIcon"></ion-icon>
                <span id="lockText">Bloquear NVX</span>
            `;
            
            const logoutBtn = menuOpcoes.querySelector('.logout-btn');
            if (logoutBtn) {
                menuOpcoes.insertBefore(lockBtn, logoutBtn);
            } else {
                menuOpcoes.appendChild(lockBtn);
            }
        }
    }

    function showNotification(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        }
    }

    function lockDashboard() {
        isDashboardLocked = true;
        
        const nvxCard = document.querySelector('.saldo-container.card-gradient-nvx');
        if (nvxCard && !nvxCard.querySelector('.nvx-locked-overlay')) {
            nvxCard.classList.add('card-locked', 'allow-unlock');
            
            const overlay = document.createElement('div');
            overlay.className = 'nvx-locked-overlay';
            overlay.innerHTML = `
                <div class="nvx-locked-content">
                    <ion-icon name="lock-closed" class="nvx-lock-icon"></ion-icon>
                    <h3>Carteira Nova-X Bloqueada</h3>
                    <p>Clique para desbloquear</p>
                </div>
            `;
            nvxCard.appendChild(overlay);
        }

        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer && !chartContainer.querySelector('.nvx-locked-overlay')) {
            chartContainer.style.position = 'relative';
            
            const chartOverlay = document.createElement('div');
            chartOverlay.className = 'nvx-locked-overlay';
            chartOverlay.innerHTML = `
                <div class="nvx-locked-content">
                    <ion-icon name="lock-closed" class="nvx-lock-icon"></ion-icon>
                    <h3>Gráfico Bloqueado</h3>
                    <p>Clique para desbloquear</p>
                </div>
            `;
            chartContainer.appendChild(chartOverlay);
        }

        updateHeaderButton(true);
        blockNVXOptions();
        
        if (autoLockTimeout) {
            clearTimeout(autoLockTimeout);
            autoLockTimeout = null;
        }
        
        showNotification('Nova-X bloqueada!', 'info');
        console.log('Dashboard bloqueado');
    }

    function unlockDashboard() {
        isDashboardLocked = false;
        
        const nvxCard = document.querySelector('.saldo-container.card-gradient-nvx');
        if (nvxCard) {
            const overlay = nvxCard.querySelector('.nvx-locked-overlay');
            if (overlay) overlay.remove();
            nvxCard.classList.remove('card-locked', 'allow-unlock');
        }

        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            const chartOverlay = chartContainer.querySelector('.nvx-locked-overlay');
            if (chartOverlay) chartOverlay.remove();
        }

        updateHeaderButton(false);
        unblockNVXOptions();
        resetAutoLockTimer();
        showNotification('Nova-X desbloqueada!', 'success');
        console.log('Dashboard desbloqueado');
    }

    function blockNVXOptions() {
        const nvxOption = document.getElementById('nvxOption');
        if (nvxOption) {
            nvxOption.classList.add('nvx-blocked');
            
            if (nvxOption.classList.contains('selected')) {
                nvxOption.classList.remove('selected');
                const realOption = document.getElementById('realOption');
                if (realOption) {
                    realOption.classList.add('selected');
                    if (typeof window.selectedCurrency !== 'undefined') {
                        window.selectedCurrency = 'BRL';
                    }
                }
            }
        }

        const transferTabs = document.querySelectorAll('#transferModal .tab-btn');
        if (transferTabs.length >= 2) {
            const nvxTransferTab = transferTabs[1];
            nvxTransferTab.classList.add('nvx-transfer-blocked');
        }

        const sendNVXForm = document.getElementById('sendNVXForm');
        if (sendNVXForm) {
            sendNVXForm.classList.add('nvx-form-blocked');
        }
    }

    function unblockNVXOptions() {
        const nvxOption = document.getElementById('nvxOption');
        if (nvxOption) {
            nvxOption.classList.remove('nvx-blocked');
        }

        const transferTabs = document.querySelectorAll('#transferModal .tab-btn');
        if (transferTabs.length >= 2) {
            const nvxTransferTab = transferTabs[1];
            nvxTransferTab.classList.remove('nvx-transfer-blocked');
        }

        const sendNVXForm = document.getElementById('sendNVXForm');
        if (sendNVXForm) {
            sendNVXForm.classList.remove('nvx-form-blocked');
        }
    }

    function updateHeaderButton(locked) {
        const lockBtn = document.getElementById('lockBtn');
        const lockIcon = document.getElementById('lockIcon');
        const lockText = document.getElementById('lockText');
        
        if (lockBtn) lockBtn.className = locked ? 'lock-btn-header locked' : 'lock-btn-header';
        if (lockIcon) lockIcon.setAttribute('name', locked ? 'lock-closed' : 'lock-open');
        if (lockText) lockText.textContent = locked ? 'NVX Bloqueada' : 'Bloquear NVX';
    }

    function openUnlockModal() {
        const termosAceitos = window.termosForamAceitos ? window.termosForamAceitos() : false;
        const senhaConfigurada = window.temSenhaNVX ? window.temSenhaNVX() : false;
        
        if (!termosAceitos) {
            const termsModal = document.getElementById('nvxTermsModal');
            if (termsModal) {
                termsModal.style.display = 'block';
                setTimeout(() => termsModal.classList.add('show'), 10);
                document.body.style.overflow = 'hidden';
            }
            return;
        }
        
        if (termosAceitos && !senhaConfigurada) {
            const setupModal = document.getElementById('nvxPasswordSetupModal');
            if (setupModal) {
                setupModal.style.display = 'block';
                setTimeout(() => setupModal.classList.add('show'), 10);
            }
            return;
        }
        
        const modal = document.getElementById('unlockModal');
        if (!modal) return;
        
          modal.style.display = 'block';
          setTimeout(() => modal.classList.add('show'), 10);
          
          const passwordInput = document.getElementById('unlockBlockchainPassword');
          if (passwordInput) {
              passwordInput.value = '';
              passwordInput.type = 'password';
          }
        
        const errorDiv = document.getElementById('unlockError');
        if (errorDiv) errorDiv.style.display = 'none';
        
        const eyeIcon = document.getElementById('unlockEyeIcon');
        if (eyeIcon) eyeIcon.setAttribute('name', 'eye');
    }

    function closeUnlockModal() {
        const modal = document.getElementById('unlockModal');
        if (!modal) return;
        
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    function handleUnlock(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        const passwordField = document.getElementById('unlockBlockchainPassword');
        const errorDiv = document.getElementById('unlockError');

        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }

        const password = passwordField ? passwordField.value.trim() : '';

        if (!password) {
            if (errorDiv) {
                errorDiv.textContent = 'Digite sua senha da blockchain';
                errorDiv.style.display = 'block';
            }
            return;
        }

        const senhaSalva = window.getSenhaNVX ? window.getSenhaNVX() : null;

        if (!senhaSalva) {
            if (errorDiv) {
                errorDiv.textContent = 'Senha da blockchain não configurada!';
                errorDiv.style.display = 'block';
            }
            return;
        }
        
        signBlockchain(password)
        
    }

    function resetAutoLockTimer() {
        if (autoLockTimeout) clearTimeout(autoLockTimeout);
        
        autoLockTimeout = setTimeout(() => {
            if (!isDashboardLocked) {
                lockDashboard();
                showNotification('Nova-X bloqueada por inatividade', 'info');
            }
        }, AUTO_LOCK_TIME);
    }

    function setupActivityMonitoring() {
        if (activityMonitoringBound) return;
        activityMonitoringBound = true;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        events.forEach(event => {
            document.addEventListener(event, () => {
                if (!isDashboardLocked) {
                    resetAutoLockTimer();
                }
            });
        });
    }

    function setupEvents() {
        // Event delegation para cliques
        document.addEventListener('click', function(e) {
            // Verificar se clicou em um ion-icon de olho OU no elemento pai
            const clickedElement = e.target;
            const isIonIcon = clickedElement.tagName === 'ION-ICON';
            const parentIsEyeIcon = clickedElement.parentElement && 
                                   clickedElement.parentElement.classList && 
                                   clickedElement.parentElement.classList.contains('unlock-eye-icon');
            
            // Se clicou no ion-icon dentro do eye-icon, usar o pai
            const eyeElement = (isIonIcon && parentIsEyeIcon) ? clickedElement.parentElement : clickedElement;
            
            // ===== TRATAMENTO DOS ÍCONES DE OLHO (PRIORIDADE MÁXIMA) =====
            if (eyeElement.id === 'unlockEyeIcon' || eyeElement.classList.contains('unlock-eye-icon')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Descobrir qual olho foi clicado pelo ID ou pelo input relacionado
                if (eyeElement.id === 'unlockEyeIcon') {
                    console.log('Clicou no olho de DESBLOQUEIO');
                    window.toggleUnlockPassword();
                    return;
                } else if (eyeElement.id === 'newPasswordEye') {
                    console.log('Clicou no olho de NOVA SENHA');
                    window.togglePasswordVisibility('nvxNewPassword', 'newPasswordEye');
                    return;
                } else if (eyeElement.id === 'confirmPasswordEye') {
                    console.log('Clicou no olho de CONFIRMAR SENHA');
                    window.togglePasswordVisibility('nvxConfirmPassword', 'confirmPasswordEye');
                    return;
                }
                
                // Fallback: tentar descobrir pelo container
                const container = eyeElement.closest('.unlock-password-container');
                if (container) {
                    const input = container.querySelector('input');
                    if (input && eyeElement.id) {
                        console.log('Clicou em olho genérico:', input.id, eyeElement.id);
                        window.togglePasswordVisibility(input.id, eyeElement.id);
                        return;
                    }
                }
            }
            
            // Botão de lock
            if (e.target.closest('#lockBtn')) {
                e.preventDefault();
                if (isDashboardLocked) {
                    openUnlockModal();
                } else {
                    lockDashboard();
                }
                return;
            }

            // Fechar modal
            if (e.target.closest('#unlockModal .close-btn')) {
                closeUnlockModal();
                return;
            }
            
            // Submit unlock
            if (e.target.closest('#unlockModal .submit-btn')) {
                handleUnlock();
                return;
            }

            // Clique no overlay bloqueado
            if (e.target.closest('.nvx-locked-overlay') || 
                e.target.closest('.card-locked.allow-unlock')) {
                e.preventDefault();
                if (isDashboardLocked) {
                    openUnlockModal();
                }
                return;
            }
        }, true); // USE CAPTURE PHASE!

        // Adicionar listeners diretos também como backup
        setTimeout(() => {
            const unlockEye = document.getElementById('unlockEyeIcon');
            if (unlockEye) {
                unlockEye.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.toggleUnlockPassword();
                }, true);
            }

            const newPassEye = document.getElementById('newPasswordEye');
            if (newPassEye) {
                newPassEye.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.togglePasswordVisibility('nvxNewPassword', 'newPasswordEye');
                }, true);
            }

            const confirmPassEye = document.getElementById('confirmPasswordEye');
            if (confirmPassEye) {
                confirmPassEye.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.togglePasswordVisibility('nvxConfirmPassword', 'confirmPasswordEye');
                }, true);
            }
        }, 1000);

        // Enter para submeter
        const passwordInput = document.getElementById('unlockBlockchainPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUnlock();
                }
            });
        }
    }

    function interceptNVXOperations() {
        const originalOpenConversionModal = window.openConversionModal;
        if (typeof originalOpenConversionModal === 'function') {
            window.openConversionModal = function() {
                if (isDashboardLocked) {
                    showNotification('Desbloqueie a Nova-X para comprar NVX!', 'error');
                    return;
                }
                originalOpenConversionModal();
            };
        }
        
        const originalOpenReverseConversionModal = window.openReverseConversionModal;
        if (typeof originalOpenReverseConversionModal === 'function') {
            window.openReverseConversionModal = function() {
                if (isDashboardLocked) {
                    showNotification('Desbloqueie a Nova-X para vender NVX!', 'error');
                    return;
                }
                originalOpenReverseConversionModal();
            };
        }

        const originalProcessPayment = window.processPayment;
        if (typeof originalProcessPayment === 'function') {
            window.processPayment = function() {
                const selectedCurrency = window.selectedCurrency;
                
                if (isDashboardLocked && selectedCurrency === 'NVX') {
                    showNotification('Desbloqueie a Nova-X para pagar com NVX!', 'error');
                    return false;
                }
                
                return originalProcessPayment.apply(this, arguments);
            };
        }

        const originalSelectCurrency = window.selectCurrency;
        if (typeof originalSelectCurrency === 'function') {
            window.selectCurrency = function(currency) {
                if (isDashboardLocked && currency === 'NVX') {
                    showNotification('Desbloqueie a Nova-X para usar NVX!', 'error');
                    return false;
                }
                
                return originalSelectCurrency.apply(this, arguments);
            };
        }

        const originalPerformNVXTransfer = window.performNVXTransfer;
        if (typeof originalPerformNVXTransfer === 'function') {
            window.performNVXTransfer = function() {
                if (isDashboardLocked) {
                    showNotification('Desbloqueie a Nova-X para transferir NVX!', 'error');
                    return false;
                }
                
                return originalPerformNVXTransfer.apply(this, arguments);
            };
        }

        const observer = new MutationObserver(function(mutations) {
            if (isDashboardLocked) {
                blockNVXOptions();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                if (isDashboardLocked) {
                    openUnlockModal();
                } else {
                    lockDashboard();
                }
            }
        });
    }

    function checkAndLockIfNeeded() {
        const termosAceitos = localStorage.getItem('nvx_terms_accepted') === 'true';
        const senhaConfigurada = localStorage.getItem('nvx_blockchain_password');

        console.log('Verificação de bloqueio:', {
            termosAceitos,
            senhaConfigurada: !!senhaConfigurada
        });

        if (termosAceitos && senhaConfigurada) {
            console.log('Condições atendidas - bloqueando dashboard');
            setTimeout(() => lockDashboard(), 200);
        } else {
            console.log('Aguardando termos/senha...');
            setTimeout(() => lockDashboard(), 200);
        }
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        injectLockSystem();
        
        setTimeout(() => {
            setupEvents();
            setupActivityMonitoring();
            interceptNVXOperations();
            setupKeyboardShortcuts();
            checkAndLockIfNeeded();
        }, 2500);

        console.log('Sistema de Bloqueio Nova-X carregado');
    }

    window.NovaXLock = {
        lockDashboard,
        unlockDashboard,
        openUnlockModal,
        closeUnlockModal,
        isDashboardLocked: () => isDashboardLocked
    };

    window.lockDashboard = lockDashboard;
    window.unlockDashboard = unlockDashboard;
    window.openUnlockModal = openUnlockModal;
    window.closeUnlockModal = closeUnlockModal;
    window.resetAutoLockTimer = resetAutoLockTimer;
    window.setupActivityMonitoring = setupActivityMonitoring;
    window.handleUnlock = handleUnlock;
    window.initLockSystem = function() {
        setupActivityMonitoring();
        resetAutoLockTimer();
    };

    init();

})();
