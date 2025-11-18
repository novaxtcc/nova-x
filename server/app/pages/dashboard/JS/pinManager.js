(function () {
    'use strict';

    const PIN_KEY = 'nvx_transaction_pin';
    const PIN_LENGTH = 6;

    let setupModal = null;
    let verifyModal = null;
    let setupResolve = null;
    let verifyResolve = null;
    let escapeHandlerBound = false;

    function sanitizePin(value) {
        return (value || '').replace(/\D/g, '').slice(0, PIN_LENGTH);
    }

    function setInputValue(input, value) {
        if (!input) return;
        input.value = value;
    }

    function handleNumericInput(event) {
        const input = event.target;
        const sanitized = sanitizePin(input.value);
        if (sanitized !== input.value) {
            input.value = sanitized;
        }
    }

    function encodePin(pin) {
        return btoa(pin);
    }

    function decodePin(encoded) {
        try {
            return atob(encoded);
        } catch (error) {
            console.error('[NVX] Erro ao decodificar PIN:', error);
            return null;
        }
    }

    function getStoredPin() {
        const stored = localStorage.getItem(PIN_KEY);
        if (!stored) return null;

        const decoded = decodePin(stored);
        if (!decoded || !/^\d{6}$/.test(decoded)) {
            localStorage.removeItem(PIN_KEY);
            return null;
        }

        return decoded;
    }

    function hasPin() {
        return !!getStoredPin();
    }

    async function savePin(pin) {
        const userAtual = JSON.parse(localStorage.getItem("user"));
        const cpf = userAtual.cpf;
        let pinCode = encodePin(pin)
        try{
            const response = await fetch("http://localhost:3000/savePin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cpf, pinCode
                })
            });

            const result = await response.json();
            if (result.success){
                localStorage.setItem(PIN_KEY, pinCode);
            }
            else {
                alert("Falha ao cadastrar pin")
            }
        } catch(error){
            console.log("Erro ao processar pin:", error)
            alert("Erro ao processar pin")
        }
    }

    function showModal(modal) {
        if (!modal) return;
        modal.style.display = 'block';
        modal.dataset.open = 'true';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    function hideModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            delete modal.dataset.open;
        }, 300);
    }

    function handleSetupSubmit() {
        if (!setupModal) return;

        const pinInput = setupModal.querySelector('#nvxPinInput');
        const confirmInput = setupModal.querySelector('#nvxPinConfirmInput');
        const errorDiv = setupModal.querySelector('#nvxPinSetupError');

        const pin = sanitizePin(pinInput ? pinInput.value : '');
        const confirmPin = sanitizePin(confirmInput ? confirmInput.value : '');

        setInputValue(pinInput, pin);
        setInputValue(confirmInput, confirmPin);

        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }

        if (pin.length !== PIN_LENGTH) {
            if (errorDiv) {
                errorDiv.textContent = 'Informe os 6 digitos do codigo.';
                errorDiv.style.display = 'block';
            }
            return;
        }

        if (pin !== confirmPin) {
            if (errorDiv) {
                errorDiv.textContent = 'Os codigos nao coincidem.';
                errorDiv.style.display = 'block';
            }
            return;
        }

        savePin(pin);
        hideModal(setupModal);

        if (typeof showNotification === 'function') {
            showNotification('Codigo de seguranca cadastrado com sucesso!', 'success');
        }

        if (setupResolve) {
            setupResolve(true);
            setupResolve = null;
        }
    }

    function cancelVerify(reason) {
        if (!verifyModal) return;
        hideModal(verifyModal);
        if (verifyResolve) {
            verifyResolve(reason === 'confirmed');
            verifyResolve = null;
        }
    }

    function handleVerifySubmit() {
        if (!verifyModal) return;

        const pinInput = verifyModal.querySelector('#nvxPinVerifyInput');
        const errorDiv = verifyModal.querySelector('#nvxPinVerifyError');
        const pin = sanitizePin(pinInput ? pinInput.value : '');

        setInputValue(pinInput, pin);

        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }

        if (pin.length !== PIN_LENGTH) {
            if (errorDiv) {
                errorDiv.textContent = 'Digite o codigo completo.';
                errorDiv.style.display = 'block';
            }
            return;
        }

        const storedPin = getStoredPin();

        if (!storedPin) {
            if (errorDiv) {
                errorDiv.textContent = 'Nenhum codigo cadastrado. Cadastre um novo codigo.';
                errorDiv.style.display = 'block';
            }
            cancelVerify('cancelled');
            requestPinSetup();
            return;
        }

        if (pin !== storedPin) {
            if (errorDiv) {
                errorDiv.textContent = 'Codigo incorreto. Tente novamente.';
                errorDiv.style.display = 'block';
            }
            return;
        }

        cancelVerify('confirmed');
    }

    function attachSetupListeners() {
        if (!setupModal) return;

        const pinInput = setupModal.querySelector('#nvxPinInput');
        const confirmInput = setupModal.querySelector('#nvxPinConfirmInput');
        const saveBtn = setupModal.querySelector('#nvxPinSaveBtn');

        if (pinInput) {
            pinInput.addEventListener('input', handleNumericInput);
            pinInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (confirmInput) confirmInput.focus();
                }
            });
        }

        if (confirmInput) {
            confirmInput.addEventListener('input', handleNumericInput);
            confirmInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSetupSubmit();
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', handleSetupSubmit);
        }
    }

    function attachVerifyListeners() {
        if (!verifyModal) return;

        const pinInput = verifyModal.querySelector('#nvxPinVerifyInput');
        const confirmBtn = verifyModal.querySelector('#nvxPinVerifyConfirm');
        const cancelBtn = verifyModal.querySelector('#nvxPinVerifyCancel');
        const closeBtn = verifyModal.querySelector('#nvxPinVerifyCloseBtn');

        if (pinInput) {
            pinInput.addEventListener('input', handleNumericInput);
            pinInput.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleVerifySubmit();
                }
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleVerifySubmit);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => cancelVerify('cancelled'));
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => cancelVerify('cancelled'));
        }
    }

    function createSetupModal() {
        if (setupModal) return;

        setupModal = document.createElement('div');
        setupModal.id = 'nvxPinSetupModal';
        setupModal.className = 'unlock-modal nvx-pin-modal';
        setupModal.dataset.locked = 'true';
        setupModal.innerHTML = `
            <div class="unlock-modal-content">
        <div class="modal-header">
            <div class="modal-header-title">
            <ion-icon name="keypad" class="modal-icon"></ion-icon>
            <h2>Cadastre seu código de segurança</h2>
            </div>
        </div>

        <div class="modal-body">
            <p class="unlock-info">
            <ion-icon name="shield-checkmark"></ion-icon>
            Defina um código numérico de 6 dígitos para autorizar transações.
            </p>

            <div class="form-group">
            <label for="nvxPinInput">Código de 6 dígitos</label>
            <input
                type="password"
                id="nvxPinInput"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6">
            </div>

            <div class="form-group">
            <label for="nvxPinConfirmInput">Confirme o código</label>
            <input
                type="password"
                id="nvxPinConfirmInput"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6">
            </div>

            <div class="lock-error-message" id="nvxPinSetupError"></div>

            <button type="button" class="submit-btn" id="nvxPinSaveBtn">
            <ion-icon name="checkmark-circle"></ion-icon>
            Salvar código
            </button>
        </div>
        </div>
        `;

        document.body.appendChild(setupModal);
        setupModal.addEventListener('click', (event) => {
            if (event.target === setupModal && setupModal.dataset.locked === 'true') {
                event.preventDefault();
                event.stopPropagation();
            }
        });
        attachSetupListeners();
    }

    function createVerifyModal() {
        if (verifyModal) return;

        verifyModal = document.createElement('div');
        verifyModal.id = 'nvxPinVerifyModal';
        verifyModal.className = 'unlock-modal';
        verifyModal.innerHTML = `
            <div class="unlock-modal-content">
                <div class="modal-header">
                    <div class="modal-header-title">
                        <ion-icon name="finger-print" class="modal-icon"></ion-icon>
                        <h2>Confirme sua operacao</h2>
                    </div>
                    <button class="close-btn" type="button" id="nvxPinVerifyCloseBtn">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="unlock-info">
                        <ion-icon name="lock-closed"></ion-icon>
                        Informe o codigo de 6 digitos para continuar.
                    </p>
                    <p class="pin-action-label" id="nvxPinActionLabel"></p>
                    <div class="form-group">
                        <label for="nvxPinVerifyInput">Codigo de seguranca</label>
                        <div class="unlock-password-container">
                            <input
                                type="password"
                                id="nvxPinVerifyInput"
                                inputmode="numeric"
                                autocomplete="one-time-code"
                                maxlength="6">
                        </div>
                    </div>
                    <div class="lock-error-message" id="nvxPinVerifyError"></div>
                    <div class="modal-actions">
                        <button type="button" class="cancel-btn" id="nvxPinVerifyCancel">
                            <ion-icon name="close-circle"></ion-icon>
                            Cancelar
                        </button>
                        <button type="button" class="submit-btn" id="nvxPinVerifyConfirm">
                            <ion-icon name="checkmark-circle"></ion-icon>
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(verifyModal);
        attachVerifyListeners();
    }

    function ensureModals() {
        if (!setupModal) {
            createSetupModal();
        }

        if (!verifyModal) {
            createVerifyModal();
        }

        if (!escapeHandlerBound) {
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' &&
                    setupModal &&
                    setupModal.dataset.open === 'true' &&
                    setupModal.dataset.locked === 'true') {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }, true);
            escapeHandlerBound = true;
        }
    }

    function openSetupModal() {
        ensureModals();
        if (!setupModal) return;

        const pinInput = setupModal.querySelector('#nvxPinInput');
        const confirmInput = setupModal.querySelector('#nvxPinConfirmInput');
        const errorDiv = setupModal.querySelector('#nvxPinSetupError');

        setInputValue(pinInput, '');
        setInputValue(confirmInput, '');

        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }

        showModal(setupModal);
        setupModal.dataset.open = 'true';

        setTimeout(() => {
            if (pinInput) pinInput.focus();
        }, 350);
    }

    function requestPinSetup() {
        if (hasPin()) {
            return Promise.resolve(true);
        }

        openSetupModal();

        return new Promise(resolve => {
            setupResolve = resolve;
        });
    }

    function openVerifyModal(actionLabel) {
        ensureModals();
        if (!verifyModal) return;

        const labelElement = verifyModal.querySelector('#nvxPinActionLabel');
        const pinInput = verifyModal.querySelector('#nvxPinVerifyInput');
        const errorDiv = verifyModal.querySelector('#nvxPinVerifyError');

        if (labelElement) {
            labelElement.textContent = actionLabel || '';
            labelElement.style.display = actionLabel ? 'block' : 'none';
        }

        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }

        setInputValue(pinInput, '');

        showModal(verifyModal);

        setTimeout(() => {
            if (pinInput) pinInput.focus();
        }, 350);

        return new Promise(resolve => {
            verifyResolve = resolve;
        });
    }

    async function requirePin(actionLabel) {
        if (!hasPin()) {
            await requestPinSetup();
        }

        return openVerifyModal(actionLabel);
    }

    ensureModals();

    window.NovaXPin = {
        hasPin,
        ensurePinSetup: requestPinSetup,
        openSetupModal,
        requirePin,
        getStoredPin,
        isSetupOpen: () => !!(setupModal && setupModal.dataset.open === 'true'),
        isVerifyOpen: () => !!(verifyModal && verifyModal.dataset.open === 'true')
    };
})();
