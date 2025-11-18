// ==================== Variáveis do WebSocket e estado ====================
let socket;
let currentUser = null;
let blockchain = [];
let balances = {};
let users = [];
var key = null;
var transacao = null

// ==================== Inicializa conexão WebSocket ====================
function initWebSocket() {
    socket = new WebSocket("ws://127.0.0.1:8770")//WebSocket("wss://blockchain-tvog.onrender.com");

    socket.onopen = () => {
        // requestInitialData();
    };

    socket.onmessage = event => {
        handleWebSocketMessage(event.data);
    };

    socket.onclose = () => {
        showNotification("Conexão perdida. Tentando reconectar...", "error");
        setTimeout(initWebSocket, 5000);
    };

    socket.onerror = () => {
        showNotification("Erro na conexão com o servidor", "error");
    };
}

// Solicita dados iniciais
function signBlockchain(senha) {
    if (socket.readyState === WebSocket.OPEN) {
        // console.log("Comando console.log no localStorage.getItem('user'): ", localStorage.getItem("user"))
        const userAtual = JSON.parse(localStorage.getItem("user"));
        const username = userAtual.nome_completo.split(" ")[0];

        key = senha
        // const senha = window.document.getElementById("nvxNewPassword")
        socket.send(JSON.stringify({ 
            type: "SIGNUP_SIGNIN", 
            cpf: userAtual.cpf, 
            username: username, 
            email: userAtual.email, 
            key: senha
        }));
    }
}

// Atualiza saldo e blockchain automaticamente
function updateAutomaticBalance() {
    if (socket.readyState === WebSocket.OPEN) {
        const userAtual = JSON.parse(localStorage.getItem("user"));
        let cpf = userAtual.cpf
        // console.log("cpf: ", cpf)
        socket.send(JSON.stringify({ type: "BALANCE", username: cpf }));
        // socket.send(JSON.stringify({ type: "GET_CHAIN" }));
    }
}

async function transfer(dest, value, user = null, psw = null, t = null){
    if (socket.readyState === WebSocket.OPEN) {
        transacao = t ? t : null
        const userAtual = JSON.parse(localStorage.getItem("user"));
        let cpf = user ? user : userAtual.cpf
        let senha = psw ? psw : key
        await socket.send(JSON.stringify({ type: "NEW_TRANSACTION", sender: cpf, key: senha, receiver: dest, amount: value }));
    }
}

// ==================== Manipula mensagens do servidor ====================
function handleWebSocketMessage(message) {
    try {
        const data = JSON.parse(message);
        switch (data.type) {
            case "INIT":
                handleInitData(data);
                break;
            case "BALANCE":
                handleBalanceUpdate(data);
                break;
            case "NEW_BLOCK":
                handleNewBlock(data);
                break;
            case "SINGED":
                handleSignInResponse(data);
                break;
            case "GET_CHAIN":
                handleGetChainResponse(data);
                break;
            case "RESPONSE_TRANSACTION":
                handleResponseTransaction(data);
            default:
                console.log("Tipo de mensagem desconhecido:", data);
        }
    } catch (error) {
        console.error("Erro ao processar mensagem:", error);
    }
}

// ==================== Handlers ====================
function handleGetChainResponse(data) {
    blockchain = data.chain || [];
    updateBlockchainView();
    updateStats();
    if (currentUser) updateUserTransactionsView();
    blockchainLoader.style.display = "none";
}

function handleInitData(data) {
    blockchain = data.chain || [];
    balances = data.balances || {};
    users = data.users || [];
    updateBlockchainView();
    updateStats();
    if (currentUser && balances[currentUser]) updateUserBalance();
    blockchainLoader.style.display = "none";
}

function handleBalanceUpdate(data) {
    // console.log(data)
    saldoNVXAtual = data.balances
    window.document.getElementById('saldoValor').textContent = data.balances.toString().replace('.', ',')
    window.document.getElementById('nvxPrice').textContent = formatCurrency(precoNVX)
    atualizarSaldoInterface()
}

function handleNewBlock(data) {
    blockchain.push(data);
    updateBlockchainView();
    updateStats();
    updateUserTransactionsView();
    showNotification("Novo bloco adicionado!", "success");
}

async function handleSignInResponse(data) {
    if (data.success === 'true') {
        localStorage.setItem('nvx_blockchain_password', true);
        currentUser = data.username
        window.document.getElementById('saldoValor').innerHTML = data.balance

        if (data.user === 'signup'){
            await transfer(data.username, 15, "system", "novaX")
        }

        const modal = window.document.getElementById('nvxPasswordSetupModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
            document.body.style.overflow = 'auto';
        }
        // Atualiza saldo automaticamente a cada 2s
        setInterval(updateAutomaticBalance, 2000);
        solicitarCadastroPIN(350);

        closeUnlockModal();
        unlockDashboard();
        // updateUserTransactionsView();
        showNotification(`Bem-vindo, ${currentUser}!`, "success");
    } else {
        key = null;
        const errorDiv = window.document.getElementById('unlockError');
        errorDiv.textContent = 'Senha incorreta';
        errorDiv.style.display = 'block';
        showNotification("Falha no login. " + (data.message || "Tente novamente."), "error");
    }
}

function handleResponseTransaction(data){
    if (data.success === "true"){
        if (transacao){
            adicionarTransacao(transacao)
        } else {
            adicionarTransacao({
                id: generateTransactionId(),
                tipo: 'send',
                titulo: 'Transferência NVX',
                descricao: `Para: ${document.getElementById('recipientAddress').value.slice(0, 15)}... • ${getCurrentTime()}`,
                valor: -parseCurrency(document.getElementById('nvxTransferAmount').value),
                moeda: 'NVX',
                destinatario: document.getElementById('recipientAddress').value,
                taxa: 0,
                dataCompleta: getCurrentFullDateTime()
            });
        }
        
        atualizarSaldoInterface();
        atualizarTransacoes();
        closeTransferModal();
        
        showNotification(`Transferência de ${formatCurrency(parseCurrency(document.getElementById('nvxTransferAmount').value), 'NVX')} realizada!`, 'success');
    } else {
        showNotification(data.message, 'error')
    }
}

// Inicia WebSocket ao carregar página
window.addEventListener("load", () => {
    initWebSocket()
});
