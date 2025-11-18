// ============================= //
//      VARIÁVEIS GLOBAIS        //
// ============================= //
let saldoNVXAtual = 0.00000000;
let saldoReaisAtual = 0;
let precoNVX = 3.00;
let selectedCurrency = 'NVX';
let currentReceiptData = null;
let transacoes = [];

const paymentConversionLog = [];

window.getPrecoNVX = () => precoNVX;
window.setPrecoNVX = (value) => {
    const parsed = Number(value);
    precoNVX = Number.isFinite(parsed) ? parsed : precoNVX;
};

window.NVXConversionLog = paymentConversionLog;

async function solicitarPinTransacao(descricao, cancelMessage = 'Transacao cancelada.') {
    if (!window.NovaXPin || typeof window.NovaXPin.requirePin !== 'function') {
        return true;
    }

    try {
        const autorizado = await window.NovaXPin.requirePin(descricao);
        if (!autorizado && typeof showNotification === 'function') {
            showNotification(cancelMessage, 'info');
        }
        return autorizado;
    } catch (error) {
        console.error('[NVX] Erro ao validar PIN:', error);
        if (typeof showNotification === 'function') {
            showNotification('Erro ao validar o PIN.', 'error');
        }
        return false;
    }
}

// ============================= //
//      FORMATAÇÃO DE MOEDA      //
// ============================= //

/**
 * Formata valor como moeda
 * @param {number} value - Valor numérico
 * @param {string} currency - 'BRL' ou 'NVX'
 * @param {boolean} showSymbol - Mostrar símbolo da moeda
 * @returns {string} Valor formatado
 */
function formatCurrency(value, currency = 'BRL', showSymbol = true) {
    if (value === null || value === undefined || isNaN(value)) return '0,00';
    
    const numValue = parseFloat(value) || 0;
    
    if (currency === 'BRL') {
        const formatted = numValue.toLocaleString('pt-BR', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return showSymbol ? `R$ ${formatted}` : formatted;
    } else if (currency === 'NVX') {
        const formatted = numValue.toLocaleString('pt-BR', { 
            minimumFractionDigits: 8,
            maximumFractionDigits: 8
        });
        return showSymbol ? `${formatted} NVX` : formatted;
    }
    
    return numValue.toString();
}

/**
 * Converte string formatada para número
 * @param {string} value - Valor formatado
 * @returns {number} Valor numérico
 */
function parseCurrency(value) {
    // console.log()
    if (!value || value === '') return 0;
    
    let cleanValue = value.toString().trim();
    cleanValue = cleanValue.replace(/^(R\$|NVX)\s*/i, '');
    cleanValue = cleanValue.replace(/\s+/g, '');
    
    if (!cleanValue || cleanValue === '') return 0;
    
    // Remove pontos de milhares e converte vírgula para ponto
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    
    const result = parseFloat(cleanValue);
    return isNaN(result) ? 0 : result;
}

/**
 * Aplica máscara de moeda em input
 * @param {HTMLElement} input - Elemento input
 * @param {string} currency - 'BRL' ou 'NVX'
 */
function setupCurrencyMask(input, currency = 'BRL') {
    if (!input) return;
    
    const prefix = currency === 'BRL' ? 'R$ ' : 'NVX ';
    
    input.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Remove tudo que não é número
        let numbers = value.replace(/\D/g, '');
        
        if (numbers === '') {
            e.target.value = '';
            return;
        }
        
        // Converte para número baseado na moeda
        let numValue;
        let formatted;
        
        if (currency === 'BRL') {
            // Para BRL: divide por 100 para ter centavos (2 casas decimais)
            numValue = parseInt(numbers) / 100;
            
            // Formata com 2 casas decimais
            formatted = numValue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else {
            // Para NVX: divide por 100000000 para ter 8 casas decimais
            numValue = parseInt(numbers) / 100000000;
            
            // Formata com 8 casas decimais
            formatted = numValue.toLocaleString('pt-BR', {
                minimumFractionDigits: 8,
                maximumFractionDigits: 8
            });
        }
        
        e.target.value = prefix + formatted;
    });
    
    // Garantir formato ao sair do campo
    input.addEventListener('blur', function(e) {
        if (!e.target.value || e.target.value === prefix) {
            e.target.value = '';
        }
    });
    
    // Marcar input como tendo prefixo
    input.classList.add('has-prefix');
}

// ============================= //
//      SISTEMA DE MODAIS        //
// ============================= //

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        clearModalForm(modalId);
    }, 300);
}

function clearModalForm(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const inputs = modal.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type !== 'button' && input.type !== 'submit') {
            input.value = '';
        }
    });
    
    const buttons = modal.querySelectorAll('.submit-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
    });
}

// ============================= //
//      CONVERSÃO BRL → NVX      //
// ============================= //

function openConversionModal() {
    openModal('conversionModal');
    
    setTimeout(() => {
        const input = document.getElementById('conversionAmount');
        if (input) {
            setupCurrencyMask(input, 'BRL');
            input.addEventListener('input', calculateConversion);
        }
        
        const currentBalance = document.getElementById('currentRealBalance');
        if (currentBalance) {
            currentBalance.innerHTML = `<strong>${formatCurrency(saldoReaisAtual, 'BRL')}</strong>`;
        }
    }, 100);
}

function closeConversionModal() {
    closeModal('conversionModal');
}

function calculateConversion() {
    const valorReais = parseCurrency(document.getElementById('conversionAmount').value) || 0;
    const nvxRecebido = valorReais / precoNVX;
    const convertBtn = document.getElementById('convertBtn');
    const nvxReceived = document.getElementById('nvxReceived');
    
    if (nvxReceived) {
        nvxReceived.innerHTML = `<strong>${formatCurrency(nvxRecebido, 'NVX')}</strong>`;
    }
    
    if (convertBtn) {
        convertBtn.disabled = !(valorReais > 0 && valorReais <= saldoReaisAtual);
    }
    
    if (valorReais > saldoReaisAtual && valorReais > 0) {
        showNotification('Saldo insuficiente em Reais!', 'error');
    }
}

async function performConversion() {
    const valorReais = parseCurrency(document.getElementById('conversionAmount').value);
    
    if (!valorReais || valorReais <= 0) {
        showNotification('Digite um valor válido!', 'error');
        return;
    }
    
    if (valorReais > saldoReaisAtual) {
        showNotification('Saldo insuficiente em Reais!', 'error');
        return;
    }
    
    const autorizado = await solicitarPinTransacao('Confirmar conversao BRL -> NVX');
    if (!autorizado) {
        return;
    }
    
    const nvxRecebido = valorReais / precoNVX;
    
    saldoReaisAtual -= valorReais;
    saldoNVXAtual += nvxRecebido;
    
    adicionarTransacao({
        id: generateTransactionId(),
        tipo: 'exchange',
        titulo: 'Conversão BRL → NVX',
        descricao: `Taxa ${formatCurrency(precoNVX, 'BRL')}/NVX • ${getCurrentTime()}`,
        valor: nvxRecebido,
        moeda: 'NVX',
        dataCompleta: getCurrentFullDateTime()
    });
    
    atualizarSaldoInterface();
    atualizarTransacoes();
    closeConversionModal();
    
    showNotification(`Conversão realizada! ${formatCurrency(nvxRecebido, 'NVX')} adicionados.`, 'success');
}

// ============================= //
//      CONVERSÃO NVX → BRL      //
// ============================= //

function openReverseConversionModal() {
    openModal('reverseConversionModal');
    
    setTimeout(() => {
        const input = document.getElementById('reverseConversionAmount');
        if (input) {
            setupCurrencyMask(input, 'NVX');
            input.addEventListener('input', calculateReverseConversion);
        }
        
        const currentBalance = document.getElementById('currentNVXBalance');
        if (currentBalance) {
            currentBalance.innerHTML = `<strong>${formatCurrency(saldoNVXAtual, 'NVX')}</strong>`;
        }
    }, 100);
}

function closeReverseConversionModal() {
    closeModal('reverseConversionModal');
}

function calculateReverseConversion() {
    const valorNVX = parseCurrency(document.getElementById('reverseConversionAmount').value) || 0;
    const reaisRecebido = valorNVX * precoNVX;
    const convertBtn = document.getElementById('reverseConvertBtn');
    const reaisReceived = document.getElementById('reaisReceived');
    
    if (reaisReceived) {
        reaisReceived.innerHTML = `<strong>${formatCurrency(reaisRecebido, 'BRL')}</strong>`;
    }
    
    if (convertBtn) {
        convertBtn.disabled = !(valorNVX > 0 && valorNVX <= saldoNVXAtual);
    }
    
    if (valorNVX > saldoNVXAtual && valorNVX > 0) {
        showNotification('Saldo insuficiente em Nova-X!', 'error');
    }
}

async function performReverseConversion() {
    const valorNVX = parseCurrency(document.getElementById('reverseConversionAmount').value);
    
    if (!valorNVX || valorNVX <= 0) {
        showNotification('Digite um valor válido!', 'error');
        return;
    }
    
    if (valorNVX > saldoNVXAtual) {
        showNotification('Saldo insuficiente em Nova-X!', 'error');
        return;
    }
    
    const autorizado = await solicitarPinTransacao('Confirmar conversao NVX -> BRL');
    if (!autorizado) {
        return;
    }
    
    const reaisRecebido = valorNVX * precoNVX;
    
    saldoNVXAtual -= valorNVX;
    saldoReaisAtual += reaisRecebido;
    
    adicionarTransacao({
        id: generateTransactionId(),
        tipo: 'exchange',
        titulo: 'Conversão NVX → BRL',
        descricao: `Taxa ${formatCurrency(precoNVX, 'BRL')}/NVX • ${getCurrentTime()}`,
        valor: reaisRecebido,
        moeda: 'BRL',
        dataCompleta: getCurrentFullDateTime()
    });
    
    atualizarSaldoInterface();
    atualizarTransacoes();
    closeReverseConversionModal();
    
    showNotification(`Conversão realizada! ${formatCurrency(reaisRecebido, 'BRL')} adicionados.`, 'success');
}

// ============================= //
//        TRANSFERÊNCIAS         //
// ============================= //

function openTransferModal() {
    openModal('transferModal');
    showTransferOption('deposit');
}

function closeTransferModal() {
    closeModal('transferModal');
}

function showTransferOption(option) {
    const depositForm = document.getElementById('depositForm');
    const sendNVXForm = document.getElementById('sendNVXForm');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach((tab, index) => {
        if ((option === 'deposit' && index === 0) || (option === 'send' && index === 1)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    if (option === 'deposit') {
        if (depositForm) depositForm.style.display = 'block';
        if (sendNVXForm) sendNVXForm.style.display = 'none';
        
        setTimeout(() => {
            const input = document.getElementById('depositAmount');
            if (input) {
                setupCurrencyMask(input, 'BRL');
                input.addEventListener('input', validateDepositForm);
            }
            
            const method = document.getElementById('depositMethod');
            if (method) {
                method.addEventListener('change', validateDepositForm);
            }
        }, 100);
        
    } else if (option === 'send') {
        if (depositForm) depositForm.style.display = 'none';
        if (sendNVXForm) sendNVXForm.style.display = 'block';
        
        const availableNVX = document.getElementById('availableNVX');
        if (availableNVX) {
            availableNVX.innerHTML = `<strong>${formatCurrency(saldoNVXAtual, 'NVX')}</strong>`;
        }
        
        setTimeout(() => {
            const input = document.getElementById('nvxTransferAmount');
            if (input) {
                setupCurrencyMask(input, 'NVX');
                input.addEventListener('input', calculateTransferFee);
            }
        }, 100);
    }
}

function validateDepositForm() {
    const valorDeposito = parseCurrency(document.getElementById('depositAmount').value) || 0;
    const metodoDeposito = document.getElementById('depositMethod').value;
    const depositBtn = document.querySelector('#depositForm .submit-btn');
    
    if (depositBtn) {
        depositBtn.disabled = !(valorDeposito > 0 && metodoDeposito);
    }
}

function performDeposit() {
    const valorDeposito = parseCurrency(document.getElementById('depositAmount').value);
    const metodoDeposito = document.getElementById('depositMethod').value;
    
    if (!valorDeposito || valorDeposito <= 0) {
        showNotification('Digite um valor válido!', 'error');
        return;
    }
    
    if (!metodoDeposito) {
        showNotification('Selecione um método de depósito!', 'error');
        return;
    }
    
    saldoReaisAtual += valorDeposito;
    
    const metodosNomes = {
        'pix': 'PIX',
        'ted': 'TED',
    };
    
    adicionarTransacao({
        id: generateTransactionId(),
        tipo: 'receive',
        titulo: `Depósito via ${metodosNomes[metodoDeposito]}`,
        descricao: `Depósito realizado • ${getCurrentTime()}`,
        valor: valorDeposito,
        moeda: 'BRL',
        dataCompleta: getCurrentFullDateTime()
    });
    
    atualizarSaldoInterface();
    atualizarTransacoes();
    closeTransferModal();
    
    showNotification(`Depósito de ${formatCurrency(valorDeposito, 'BRL')} realizado!`, 'success');
}

function calculateTransferFee() {
    const valorTransferencia = parseCurrency(document.getElementById('nvxTransferAmount').value) || 0;
    const taxa = 0; // Sem taxa para transferências de NVX
    const total = valorTransferencia + taxa;
    const transferBtn = document.getElementById('nvxTransferBtn');
    
    const transferValue = document.getElementById('transferValue');
    const transferFee = document.getElementById('transferFee');
    const totalTransfer = document.getElementById('totalTransfer');
    
    if (transferValue) transferValue.innerHTML = `<strong>${formatCurrency(valorTransferencia, 'NVX')}</strong>`;
    if (transferFee) transferFee.innerHTML = `<strong>${formatCurrency(taxa, 'NVX')}</strong>`;
    if (totalTransfer) totalTransfer.innerHTML = `<strong>${formatCurrency(total, 'NVX')}</strong>`;
    
    if (transferBtn) {
        transferBtn.disabled = !(valorTransferencia > 0 && total <= saldoNVXAtual);
    }
    
    if (total > saldoNVXAtual && valorTransferencia > 0) {
        showNotification('Saldo insuficiente (incluindo taxa)!', 'error');
    }
}

async function performNVXTransfer() {
    const valorTransferencia = parseCurrency(document.getElementById('nvxTransferAmount').value);
    const destinatario = document.getElementById('recipientAddress').value;
    
    if (!valorTransferencia || valorTransferencia <= 0) {
        showNotification('Digite um valor válido!', 'error');
        return;
    }
    
    if (!destinatario.trim()) {
        showNotification('Digite um destinatário válido!', 'error');
        return;
    }
    
    const taxa = 0; // Sem taxa para transferências de NVX
    const total = valorTransferencia + taxa;
    
    if (total > saldoNVXAtual) {
        showNotification('Saldo insuficiente!', 'error');
        return;
    }
    
    const autorizado = await solicitarPinTransacao('Confirmar transferencia de NVX', 'Transferencia cancelada.');
    if (!autorizado) {
        return;
    }
    
    // saldoNVXAtual -= total;
    await transfer(destinatario.trim(), total)
}

// ============================= //
//          PAGAMENTOS           //
// ============================= //

function openPaymentModal() {
    openModal('paymentModal');
    
    setTimeout(() => {
        updatePaymentBalances();
        
        const paymentType = document.getElementById('paymentType');
        if (paymentType) {
            paymentType.addEventListener('change', updatePaymentForm);
        }
        
        const paymentAmount = document.getElementById('paymentAmount');
        if (paymentAmount) {
            setupCurrencyMask(paymentAmount, 'BRL');
            paymentAmount.addEventListener('input', validatePayment);
        }
    }, 100);
}

function updatePaymentBalances() {
    const realBalance = document.getElementById('realBalance');
    const nvxBalance = document.getElementById('nvxBalance');
    
    if (realBalance) realBalance.textContent = formatCurrency(saldoReaisAtual, 'BRL', false);
    if (nvxBalance) nvxBalance.textContent = formatCurrency(saldoNVXAtual, 'NVX', false);
}

function selectCurrency(currency) {
    selectedCurrency = currency;
    
    document.getElementById('realOption').classList.remove('selected');
    document.getElementById('nvxOption').classList.remove('selected');
    
    if (currency === 'BRL') {
        document.getElementById('realOption').classList.add('selected');
    } else {
        document.getElementById('nvxOption').classList.add('selected');
    }
    
    validatePayment();
}

function updatePaymentForm() {
    const paymentType = document.getElementById('paymentType').value;
    const paymentDetails = document.getElementById('paymentDetails');
    
    if (paymentDetails) {
        paymentDetails.style.display = paymentType ? 'block' : 'none';
        updatePaymentBalances();
    }
}

function validatePayment() {
    const amount = parseCurrency(document.getElementById('paymentAmount').value) || 0;
    const code = document.getElementById('paymentCode').value;
    const paymentBtn = document.getElementById('paymentBtn');
    const paymentInfo = document.getElementById('paymentInfo');
    const balanceWarning = document.getElementById('balanceWarning');
    
    if (amount > 0 && code.trim()) {
        const paymentValue = document.getElementById('paymentValue');
        const paymentNVXValue = document.getElementById('paymentNVXValue');
        const paymentTotal = document.getElementById('paymentTotal');
        const nvxConversionRow = document.getElementById('nvxConversionRow');
        const feeRow = document.getElementById('feeRow');
        
        if (paymentValue) paymentValue.innerHTML = `<strong>${formatCurrency(amount, 'BRL')}</strong>`;
        
        let canPay = false;
        
        if (selectedCurrency === 'BRL') {
            if (nvxConversionRow) nvxConversionRow.style.display = 'none';
            if (feeRow) feeRow.style.display = 'none';
            if (paymentTotal) paymentTotal.innerHTML = `<strong>${formatCurrency(amount, 'BRL')}</strong>`;
            
            canPay = amount <= saldoReaisAtual;
        } else {
            const nvxAmount = amount / precoNVX;
            const fee = Math.max(nvxAmount * 0.005, 0.10);
            const total = nvxAmount + fee;
            
            if (nvxConversionRow) nvxConversionRow.style.display = 'flex';
            if (feeRow) feeRow.style.display = 'flex';
            if (paymentNVXValue) paymentNVXValue.innerHTML = `<strong>${formatCurrency(nvxAmount, 'NVX')}</strong>`;
            if (paymentTotal) paymentTotal.innerHTML = `<strong>${formatCurrency(total, 'NVX')}</strong>`;
            
            canPay = total <= saldoNVXAtual;
        }
        
        if (canPay) {
            if (balanceWarning) balanceWarning.style.display = 'none';
        } else {
            if (balanceWarning) balanceWarning.style.display = 'block';
        }
        
        if (paymentInfo) paymentInfo.style.display = 'block';
        if (paymentBtn) paymentBtn.disabled = !canPay;
    } else {
        if (paymentInfo) paymentInfo.style.display = 'none';
        if (balanceWarning) balanceWarning.style.display = 'none';
        if (paymentBtn) paymentBtn.disabled = true;
    }
}

async function processPayment() {
    const amount = parseCurrency(document.getElementById('paymentAmount').value);
    const code = document.getElementById('paymentCode').value;
    const paymentType = document.getElementById('paymentType').value;
    
    if (!amount || !code.trim() || !paymentType) {
        showNotification('Preencha todos os campos!', 'error');
        return;
    }
    
    const typeNames = {
        'boleto': 'Pagamento de Boleto',
        'fatura': 'Pagamento de Fatura',
        'servico': 'Pagamento de Serviço',
        'comercio': 'Pagamento Comercial'
    };
    
    const autorizado = await solicitarPinTransacao('Confirmar pagamento', 'Pagamento cancelado.');
    if (!autorizado) {
        return;
    }
    
    if (selectedCurrency === 'BRL') {
        if (amount > saldoReaisAtual) {
            showNotification('Saldo insuficiente em reais!', 'error');
            return;
        }
        
        saldoReaisAtual -= amount;
        
        adicionarTransacao({
            id: generateTransactionId(),
            tipo: 'send',
            titulo: typeNames[paymentType],
            descricao: `${code.slice(0, 20)}... • ${getCurrentTime()}`,
            valor: -amount,
            moeda: 'BRL',
            dataCompleta: getCurrentFullDateTime()
        });
        
        showNotification(`Pagamento de ${formatCurrency(amount, 'BRL')} realizado!`, 'success');
        
    } else {
        const nvxAmount = amount / precoNVX;
        const fee = Math.max(nvxAmount * 0.005, 0.10);
        const total = nvxAmount + fee;
        
        if (total > saldoNVXAtual) {
            showNotification('Saldo insuficiente em NVX!', 'error');
            return;
        }
        
        const feeBRL = fee * precoNVX;
        const totalBRL = total * precoNVX;
        const conversionEntry = {
            timestamp: new Date().toISOString(),
            codigoReferencia: code,
            tipoPagamento: paymentType,
            valorOriginalBRL: amount,
            valorConvertidoNVX: nvxAmount,
            taxaNVX: fee,
            taxaBRL: feeBRL,
            totalDebitadoNVX: total,
            totalEquivalenteBRL: totalBRL,
            cotacaoUtilizada: precoNVX
        };
        paymentConversionLog.push(conversionEntry);
        console.group('[NovaX] Conversão NVX → BRL registrada');
        console.info(
            `Conta: ${formatCurrency(amount, 'BRL')} ÷ R$ ${precoNVX.toFixed(2)} = ${nvxAmount.toFixed(8)} NVX`
        );
        console.info(
            `Taxa (0,5%): ${nvxAmount.toFixed(8)} × 0,005 = ${fee.toFixed(8)} NVX (${formatCurrency(feeBRL, 'BRL')})`
        );
        console.info(
            `Total debitado: ${nvxAmount.toFixed(8)} NVX + ${fee.toFixed(8)} NVX = ${total.toFixed(8)} NVX (${formatCurrency(totalBRL, 'BRL')})`
        );
        console.info('Detalhes:', {
            codigo: code,
            tipo: paymentType,
            valorBRL: formatCurrency(amount, 'BRL'),
            debitoNVX: formatCurrency(total, 'NVX'),
            taxaNVX: formatCurrency(fee, 'NVX'),
            taxaBRL: formatCurrency(feeBRL, 'BRL'),
            cotacao: `R$ ${precoNVX.toFixed(2)}`
        });
        console.groupEnd();
        t = {
            id: generateTransactionId(),
            tipo: 'send',
            titulo: typeNames[paymentType],
            descricao: `${code.slice(0, 20)}... • ${getCurrentTime()}`,
            valor: -nvxAmount,
            moeda: 'NVX',
            taxa: fee,
            dataCompleta: getCurrentFullDateTime()
        }
        await transfer("system", total, null, null, t)
        
        showNotification(`Pagamento realizado com sucesso!`, 'success');
    }
    
    atualizarSaldoInterface();
    atualizarTransacoes();
    closeModal('paymentModal');
}

// ============================= //
//              PIX              //
// ============================= //

function openPixModal() {
    openModal('pixModal');
    
    setTimeout(() => {
        const pixAmount = document.getElementById('pixAmount');
        if (pixAmount) {
            setupCurrencyMask(pixAmount, 'BRL');
            pixAmount.addEventListener('input', validatePixSend);
        }
        
        const pixKey = document.getElementById('pixKey');
        if (pixKey) {
            pixKey.addEventListener('input', validatePixSend);
        }
    }, 100);
}

function validatePixSend() {
    const key = document.getElementById('pixKey').value;
    const amount = parseCurrency(document.getElementById('pixAmount').value) || 0;
    const pixBtn = document.getElementById('pixSendBtn');
    
    if (pixBtn) {
        pixBtn.disabled = !(key.trim() && amount > 0 && amount <= saldoReaisAtual);
    }
    
    if (amount > saldoReaisAtual && amount > 0) {
        showNotification('Saldo insuficiente em reais!', 'error');
    }
}

async function sendPix() {
    const key = document.getElementById('pixKey').value;
    const amount = parseCurrency(document.getElementById('pixAmount').value);
    
    if (!key.trim() || !amount || amount <= 0) {
        showNotification('Preencha todos os campos!', 'error');
        return;
    }
    
    if (amount > saldoReaisAtual) {
        showNotification('Saldo insuficiente!', 'error');
        return;
    }
    
    const autorizado = await solicitarPinTransacao('Confirmar envio de PIX', 'PIX cancelado.');
    if (!autorizado) {
        return;
    }
    
    saldoReaisAtual -= amount;
    
    adicionarTransacao({
        id: generateTransactionId(),
        tipo: 'pix',
        titulo: 'PIX Enviado',
        descricao: `Para: ${key.slice(0, 20)}... • ${getCurrentTime()}`,
        valor: -amount,
        moeda: 'BRL',
        destinatario: key,
        dataCompleta: getCurrentFullDateTime()
    });
    
    atualizarSaldoInterface();
    atualizarTransacoes();
    closeModal('pixModal');
    
    showNotification(`PIX de ${formatCurrency(amount, 'BRL')} enviado!`, 'success');
}

// ============================= //
//            PERFIL             //
// ============================= //

function atualizarUsuario() {
    const userAtual = JSON.parse(localStorage.getItem("user"))
    const username = document.getElementById("userName")
    const userAvatar = document.getElementById("user-avatar")
    username.innerHTML = userAtual.nome_completo.split(" ")[0]
    userAvatar.innerHTML = userAtual.nome_completo[0]
}

function openProfileModal() {
    const userAtual = JSON.parse(localStorage.getItem("user"))
    document.getElementById("profileName").value = userAtual.nome_completo
    document.getElementById("profileEmail").value = userAtual.email
    document.getElementById("profilePhone").value = userAtual.telefone

    const buttons = document.getElementById("profileModal").querySelectorAll('.submit-btn');
    buttons.forEach(btn => {
        btn.disabled = false;
    });
    openModal('profileModal');
}

async function saveProfile() {
    const userAtual = JSON.parse(localStorage.getItem("user"))
    const nome_completo = document.getElementById("profileName").value || userAtual.nome_completo
    const email = document.getElementById("profileEmail").value || userAtual.email
    const telefone = document.getElementById("profilePhone").value || userAtual.telefone
    const cpf = userAtual.cpf

    console.log(`${userAtual.cpf}, ${nome_completo}, ${email}, ${telefone}`)

    try{
        const response = await fetch("/updateUserData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf, nome_completo, email, telefone
            })
        });

        const result = await response.json();
        if (result.message === "Dados alterados com sucesso!"){
            localStorage.setItem("user", JSON.stringify(result.user))
            showNotification('Perfil atualizado com sucesso!', 'success');
            closeModal('profileModal');
        }
        else {
            showNotification(result.message, 'erro');
        }
    } catch(error){
        console.log("Erro ao processar alteração:", error)
        alert("Erro ao processar alteração")
    }
}

// ============================= //
//          COMPROVANTE          //
// ============================= //

function openReceiptModal(transaction) {
    currentReceiptData = transaction;
    
    document.getElementById('receiptType').textContent = transaction.titulo;
    document.getElementById('receiptDateTime').textContent = transaction.dataCompleta || getCurrentFullDateTime();
    document.getElementById('receiptAmount').textContent = formatCurrency(Math.abs(transaction.valor), transaction.moeda);
    document.getElementById('receiptCurrency').textContent = transaction.moeda;
    document.getElementById('receiptTransactionId').textContent = transaction.id || generateTransactionId();
    
    const destinationRow = document.getElementById('receiptDestinationRow');
    const taxRow = document.getElementById('receiptTaxRow');
    
    if (transaction.destinatario) {
        destinationRow.style.display = 'flex';
        document.getElementById('receiptDestination').textContent = transaction.destinatario;
    } else {
        destinationRow.style.display = 'none';
    }
    
    if (transaction.taxa) {
        taxRow.style.display = 'flex';
        document.getElementById('receiptTax').textContent = formatCurrency(transaction.taxa, transaction.moeda);
    } else {
        taxRow.style.display = 'none';
    }
    
    openModal('receiptModal');
}

function downloadReceipt() {
    if (!currentReceiptData) return;
    showNotification('Download do comprovante iniciado!', 'success');
}

function shareReceipt() {
    if (!currentReceiptData) return;
    showNotification('Compartilhamento iniciado!', 'info');
}

// ============================= //
//          TRANSAÇÕES           //
// ============================= //

function adicionarTransacao(transacao) {
    transacoes.unshift(transacao);
    if (transacoes.length > 20) {
        transacoes = transacoes.slice(0, 20);
    }
}

function atualizarTransacoes() {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;
    
    transactionsList.innerHTML = '';
    
    if (transacoes.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon"><ion-icon name="receipt-outline"></ion-icon></span>
                <p class="empty-text">Nenhuma transação ainda</p>
                <p class="empty-subtext">Realize uma operação para ver o histórico aqui</p>
            </div>
        `;
        return;
    }
    
    const ultimasTransacoes = transacoes.slice(0, 8);
    
    ultimasTransacoes.forEach((transacao) => {
        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        
        transactionItem.addEventListener('click', () => {
            openReceiptModal(transacao);
        });
        
        let iconClass = '';
        let iconName = '';
        let amountClass = '';
        let sinal = '';
        
        // Define ícone minimalista baseado no tipo
        if (transacao.tipo === 'receive') {
            iconClass = 'transaction-receive';
            iconName = 'arrow-down-circle';
            amountClass = 'amount-positive';
            sinal = '+';
        } else if (transacao.tipo === 'send') {
            iconClass = 'transaction-send';
            iconName = 'arrow-up-circle';
            amountClass = 'amount-negative';
            sinal = '-';
        } else if (transacao.tipo === 'exchange') {
            iconClass = 'transaction-exchange';
            iconName = 'swap-horizontal';
            amountClass = 'amount-positive';
            sinal = '+';
        } else if (transacao.tipo === 'pix') {
            iconClass = 'transaction-pix';
            iconName = 'flash';
            amountClass = 'amount-negative';
            sinal = '-';
        } else if (transacao.tipo === 'staking') {
            iconClass = 'transaction-staking';
            iconName = 'trending-up';
            amountClass = 'amount-positive';
            sinal = '+';
        } else {
            iconClass = 'transaction-send';
            iconName = 'cash';
            amountClass = 'amount-negative';
            sinal = '';
        }
        
        const valorFormatado = formatCurrency(Math.abs(transacao.valor), transacao.moeda, false);
        
        transactionItem.innerHTML = `
            <div class="transaction-details">
                <div class="transaction-icon ${iconClass}">
                    <ion-icon name="${iconName}"></ion-icon>
                </div>
                <div class="transaction-info">
                    <h4>${transacao.titulo}</h4>
                    <p>${transacao.descricao}</p>
                </div>
            </div>
            <div class="transaction-amount ${amountClass}">${sinal}${valorFormatado} ${transacao.moeda}</div>
        `;
        
        transactionsList.appendChild(transactionItem);
    });
}

function refreshTransactions() {
    atualizarTransacoes();
    showNotification('Transações atualizadas!', 'success');
}

// ============================= //
//           INTERFACE           //
// ============================= //

function atualizarSaldoInterface() {
    const saldoReaisConvertido = formatCurrency(saldoNVXAtual * precoNVX, 'BRL');
    
    const saldoValor = document.getElementById('saldoValor');
    const saldoConvertido = document.getElementById('saldoConvertido');
    const saldoReais = document.getElementById('saldoReais');
    
    if (saldoValor) {
        saldoValor.textContent = formatCurrency(saldoNVXAtual, 'NVX', false);
    }
    if (saldoConvertido) {
        saldoConvertido.textContent = `≈ ${saldoReaisConvertido}`;
    }
    if (saldoReais) {
        saldoReais.textContent = formatCurrency(saldoReaisAtual, 'BRL');
    }
}

function atualizarSaldo() {
    try {
        atualizarSaldoInterface();
    } catch (err) {
        console.error('Erro ao atualizar saldo:', err);
    }
}

// ============================= //
//          NOTIFICAÇÕES         //
// ============================= //

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// ============================= //
//    TELA DE CARREGAMENTO       //
// ============================= //

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
    }
    if (mainContent) {
        mainContent.classList.add('show');
    }
    
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, 500);
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.classList.remove('fade-out');
    }
    if (mainContent) {
        mainContent.classList.remove('show');
    }
    
    setTimeout(() => {
        hideLoadingScreen();
    }, 2000);
}

function reloadWithLoading() {
    showLoadingScreen();
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        showNotification('Fazendo logout...', 'info');
        localStorage.removeItem("user");
        localStorage.removeItem("nvx_blockchain_password");
        localStorage.removeItem("nvx_transaction_pin");
        setTimeout(() => {
            window.location.href = '../../';
        }, 1500);
    }
}

// ============================= //
//      FUNÇÕES AUXILIARES       //
// ============================= //

function generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `NVX${timestamp}${random.toString().padStart(4, '0')}`;
}

function getCurrentFullDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR');
    return `${date} às ${time}`;
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================= //
//         INICIALIZAÇÃO         //
// ============================= //

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        hideLoadingScreen();
        atualizarSaldo();
        atualizarTransacoes();
        atualizarUsuario();

        const chartModule = window.NVXChart;
        if (chartModule) {
            chartModule.initializePriceUpdates();

            setTimeout(() => {
                chartModule.initializeChart();
            }, 500);
        }
    }, 2500);
});

window.addEventListener('resize', function() {
    if (window.NVXChart) {
        window.NVXChart.handleResize();
    }
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        const modalId = event.target.id;
        closeModal(modalId);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            closeModal(modal.id);
        });
    }
});

console.log('Nova-X Banking Dashboard carregado com sucesso!');
