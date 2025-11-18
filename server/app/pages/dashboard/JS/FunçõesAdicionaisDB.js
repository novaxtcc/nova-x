/* =============================================== */
/*          SISTEMA DE PREFIXOS DE MOEDA          */
/* =============================================== */

/**
 * Adiciona prefixo "R$" aos campos de input de valores em reais
 * @param {string} inputId - ID do elemento input
 */
function addRPrefix(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Evitar duplicar o prefixo
    if (input.parentElement.querySelector('.r-prefix')) return;

    const prefix = document.createElement('span');
    prefix.className = 'r-prefix';
    prefix.textContent = 'R$';
    prefix.style.cssText = `
        position: absolute;
        left: 10px;
        top: 67.5%;
        transform: translateY(-50%);
        font-weight: bold;
        color: #000000ff;
        pointer-events: none;
        z-index: 1;
    `;

    // Ajustar o input
    input.parentElement.style.position = 'relative';
    input.style.paddingLeft = '45px';

    input.parentElement.insertBefore(prefix, input);
}

/**
 * Adiciona prefixo "NVX" aos campos de input de valores em Nova-X
 * @param {string} inputId - ID do elemento input
 */
function addNVXPrefix(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Evitar duplicar o prefixo
    if (input.parentElement.querySelector('.nvx-prefix')) return;

    const prefix = document.createElement('span');
    prefix.className = 'nvx-prefix';
    prefix.textContent = 'NVX';
    prefix.style.cssText = `
        position: absolute;
        left: 10px;
        top: 65.8%;
        transform: translateY(-50%);
        font-weight: bold;
        color: #000000ff;
        pointer-events: none;
        z-index: 1;
    `;

    // Ajustar o input
    input.parentElement.style.position = 'relative';
    input.style.paddingLeft = '45px';

    input.parentElement.insertBefore(prefix, input);
}

/*CONFIGURAÇÃO AUTOMÁTICA DE PREFIXOS*/


/*Configura prefixos automaticamente para todos os campos de moeda*/

function setupCurrencyPrefixes() {
    const fieldsR = ['conversionAmount', 'depositAmount', 'paymentAmount', 'pixAmount'];
    const fieldsNVX = ['reverseConversionAmount', 'nvxTransferAmount'];

    fieldsR.forEach(id => addRPrefix(id));
    fieldsNVX.forEach(id => addNVXPrefix(id));
}

/*CONFIGURAÇÃO DOS MODAIS*/

/*Abre modal de conversão BRL → NVX*/

function openConversionModal() {
    openModal('conversionModal');
    
    const currentBalance = document.getElementById('currentRealBalance');
    if (currentBalance) {
        currentBalance.innerHTML = `<strong>R$ ${saldoReaisAtual.toFixed(2)}</strong>`;
    }
    
    setTimeout(() => addRPrefix('conversionAmount'), 50);
}

/*Abre modal de depósito*/

function openDepositModal() {
    openModal('transferModal');
    setTimeout(() => addRPrefix('depositAmount'), 50);
}

/*Abre modal de pagamentos*/

function openPaymentModal() {
    openModal('paymentModal');
    
    setTimeout(() => {
        addRPrefix('paymentAmount');
        updatePaymentBalances();
    }, 50);
}

/*Abre modal PIX com configurações específicas*/
function openPixModal() {
    openModal('pixModal');
    showPixOption('send');
    
    setTimeout(() => addRPrefix('pixAmount'), 50);

    // Configurar saldo disponível
    setTimeout(() => {
        const sendForm = document.getElementById('pixSendForm');
        if (sendForm) {
            let saldoInfo = sendForm.querySelector('.saldo-disponivel');
            
            if (!saldoInfo) {
                saldoInfo = document.createElement('div');
                saldoInfo.className = 'saldo-disponivel';
                saldoInfo.style.cssText = `
                    margin-bottom: 15px; 
                    padding: 10px; 
                    background: #f8f9fa; 
                    border-radius: 8px; 
                    text-align: center;
                `;
                
                const firstInput = sendForm.querySelector('input');
                if (firstInput) {
                    firstInput.parentNode.insertBefore(saldoInfo, firstInput);
                }
            }
            
            saldoInfo.innerHTML = `
                <small style="color: #666;">Saldo disponível para PIX:</small><br>
                <strong style="color: #ef9b53;">
                    ${saldoReaisAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
            `;
        }
    }, 100);
}

/*INICIALIZAÇÃO*/

/*Inicialização do sistema de prefixos*/
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        hideLoadingScreen();
        atualizarSaldo();
        atualizarTransacoes();
        setupCurrencyPrefixes();
    }, 2500);
});        