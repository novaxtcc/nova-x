// ==================== Alternar visibilidade da senha ====================
function togglePassword() {
    const passwordField = document.getElementById("password");
    const eyeIcon = document.getElementById("eye-icon");

    if (passwordField.type === "password") {
        passwordField.type = "text";
        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash");
    } else {
        passwordField.type = "password";
        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye");
    }
}

// ==================== Elementos do DOM ====================
const loginPage = document.getElementById("login-page");
const appPage = document.getElementById("app");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const transactionForm = document.getElementById("transaction-form");
const userNameElement = document.getElementById("user-name");
const balanceElement = document.getElementById("balance-amount");
const userTransactionsElement = document.getElementById("user-transactions");
const blockchainInfoElement = document.getElementById("blockchain-info");
const totalBlocksElement = document.getElementById("total-blocks");
const totalUsersElement = document.getElementById("total-users");
const totalTransactionsElement = document.getElementById("total-transactions");
const transactionsLoader = document.getElementById("transactions-loader");
const blockchainLoader = document.getElementById("blockchain-loader");



// ==================== Atualizações da interface ====================
function updateUserBalance() {
    balanceElement.textContent = balances[currentUser] ?? "0";
}

function updateBlockchainView() {
    blockchainInfoElement.innerHTML = "";

    if (blockchain.length === 0) {
        blockchainInfoElement.innerHTML = "<p>Carregando blockchain...</p>";
        return;
    }

    const sortedChain = [...blockchain].sort((a, b) => b.index - a.index);

    sortedChain.forEach(block => {
        const blockElement = document.createElement("div");
        blockElement.classList.add("block-item");

        const header = document.createElement("div");
        header.classList.add("block-header");
        header.textContent = `Bloco ${block.index} - Hash: ${block.hash}`;
        blockElement.appendChild(header);

        const transactionsList = document.createElement("div");
        transactionsList.classList.add("block-transactions");

        if (block.transactions && block.transactions.length > 0) {
            block.transactions.forEach(tx => {
                const txElement = document.createElement("div");
                txElement.textContent = `${tx.sender} -> ${tx.receiver}: ${tx.amount} NovaX`;
                transactionsList.appendChild(txElement);
            });
        } else {
            transactionsList.textContent = "Sem transações neste bloco.";
        }

        blockElement.appendChild(transactionsList);
        blockchainInfoElement.appendChild(blockElement);
    });
}

function updateStats() {
    totalBlocksElement.textContent = blockchain.length;
    totalUsersElement.textContent = users.length;
    const totalTx = blockchain.reduce((sum, block) => sum + (block.transactions?.length || 0), 0);
    totalTransactionsElement.textContent = totalTx;
}

function updateUserTransactionsView() {
    userTransactionsElement.innerHTML = "";
    transactionsLoader.style.display = "none";

    const userTxs = blockchain
        .flatMap(block => block.transactions || [])
        .filter(tx => tx.sender === currentUser || tx.receiver === currentUser);

    if (userTxs.length === 0) {
        userTransactionsElement.textContent = "Nenhuma transação encontrada.";
        return;
    }

    userTxs.forEach(tx => {
        const txDiv = document.createElement("div");
        txDiv.classList.add("transaction-item");

        const details = document.createElement("div");
        details.classList.add("transaction-details");
        details.textContent = `De: ${tx.sender} Para: ${tx.receiver}`;

        const amount = document.createElement("div");
        amount.classList.add("transaction-amount");
        amount.classList.add(tx.sender === currentUser ? "amount-sent" : "amount-received");
        amount.textContent = tx.amount;

        txDiv.appendChild(details);
        txDiv.appendChild(amount);
        userTransactionsElement.appendChild(txDiv);
    });
}

// ==================== Notificações ====================
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.classList.add("notification");
    notification.textContent = message;

    if (type === "error") notification.style.backgroundColor = "red";
    if (type === "success") notification.style.backgroundColor = "green";

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// ==================== Eventos ====================
// Login (validação local com CPF e senha fixos)
loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const cpf = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try{
        const response = await fetch("login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cpf, password
            })
        });

        const result = await response.json();
        if (result.logged){
            localStorage.setItem("user", JSON.stringify(result.user))
            if(result.user.member_blockchain !== 0){
                localStorage.setItem("nvx_blockchain_password", result.user.member_blockchain)
                localStorage.setItem("nvx_terms_accepted", true)
            }
            if(result.user.pin){
                localStorage.setItem("nvx_transaction_pin", result.user.pin)
            }
            window.location.href = '../dashboard/dashboard.html'
        }
        else {
            alert("Usuário e/ou senha incorreto(s)")
        }
    } catch(error){
        console.log("Erro ao processar login:", error)
        alert("Erro ao processar login")
    }
});

// Logout
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user")
    localStorage.removeItem("nvx_transaction_pin")
    loginPage.classList.remove("hide");
    appPage.classList.add("hide");
    userNameElement.textContent = "";
});


//ARRUMAR
// Enviar transação
transactionForm.addEventListener("submit", event => {
    event.preventDefault();

    const receiver = document.getElementById("receiver").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);

    if (!receiver || isNaN(amount) || amount <= 0) return;

    socket.send(JSON.stringify({ type: "NEW_TRANSACTION", sender: currentUser, receiver, amount }));
    transactionForm.reset();
});

// Inicia WebSocket ao carregar página
window.addEventListener("load", () => {
    localStorage.removeItem("nvx_terms_accepted")
    UserAtual = localStorage.getItem("user")
    if(UserAtual){
        window.location.href = '../dashboard/dashboard.html'
    }
});
