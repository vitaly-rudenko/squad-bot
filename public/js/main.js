const paymentsFromUserSelect = document.getElementById("payments_from_user_select")
const paymentsToUserSelect = document.getElementById("payments_to_user_select")
const receiptsPayerSelect = document.getElementById("receipts_payer_select")
const paymentsAmountInput = document.getElementById("payments_amount_input")
const savePaymentButton = document.getElementById("save_payment_button")

const receiptsAmountInput = document.getElementById("receipts_amount_input")
const receiptsDescriptionInput = document.getElementById("receipts_description_input")
const receiptDebtorsContainer = document.getElementById("receipt_debtors_container")
const addReceiptButton = document.getElementById("add_receipt_button")
const divideMoneyButton = document.getElementById('divide_money_button')
const errorMessage = document.getElementById('error_message')
const fullscreenAnimationContainer = document.getElementById('fullscreen_animation_container')

let users = []

savePaymentButton.addEventListener('click', savePayment)
addReceiptButton.addEventListener('click', saveReceipt)
divideMoneyButton.addEventListener('click', divideMoneyAmongUsers)
receiptsAmountInput.addEventListener('input', calculateReceiptRemainBalance)

init()
async function init() {
    users = await getUsers()
    renderUsersSelect(paymentsFromUserSelect)
    renderUsersSelect(paymentsToUserSelect)
    renderUsersSelect(receiptsPayerSelect)
    renderDebtors()
}

async function getUsers() {
    const response = await fetch('/users', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    const usersData = await response.json()
    return usersData
}

function renderUsersSelect(selectElement) {
    let selectHtml = ``
    for (let i = 0; i < users.length; i++) {
        selectHtml += `<option ${i == 0 ? 'selected': ''} value="${users[i].id}">${users[i].name}</option>`
    }
    selectElement.innerHTML = selectHtml
}

function renderDebtors() {
    let debtorsHtml = ``
    for (let i = 0; i < users.length; i++) {
        debtorsHtml += `<div class="debtor"><div>
        <input class="debtor_checkbox" type="checkbox" checked id="debtor${i}" name="debtor${i}" value="${users[i].id}">
        <label for="debtor${i}">${users[i].name}</label></div>
        <input class="debt_amount" type="number" placeholder="0.00" oninput="calculateReceiptRemainBalance()">
    </div>`
    }
    receiptDebtorsContainer.innerHTML = debtorsHtml
}

function savePayment() {
    const amount = paymentsAmountInput.value
    if(!amount) return
    if(paymentsFromUserSelect.value == paymentsToUserSelect.value) return

    savePaymentButton.disabled = true
	savePaymentButton.innerHTML = "Обработка..."
    savePaymentButton.classList.add('disabled')

    const payment = {
        fromUserId: paymentsFromUserSelect.value,
		toUserId: paymentsToUserSelect.value,
		amount: moneyToCoins(amount),
	}

    fetch('/payments', {
        method: 'POST',
        body: JSON.stringify(payment),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then((response) => {
        return response.json();
    })
    .then((data) => {
		console.log('add new payment: ', data)
        playSuccessAnimation()
        savePaymentButton.disabled = false
	    savePaymentButton.innerHTML = "Добавить перевод"
        savePaymentButton.classList.remove('disabled')
        paymentsAmountInput.value = null
    })
    .catch(e => console.error(e))
}


function saveReceipt() {
    const amount = receiptsAmountInput.value
    if(!amount) return

    addReceiptButton.disabled = true
	addReceiptButton.innerHTML = "Обработка..."
    addReceiptButton.classList.add('disabled')

    let debts = []

    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor")
    for (let i = 0; i < debtors.length; i++) {
        const debtorCheckbox = debtors[i].querySelector(".debtor_checkbox")
        if(debtorCheckbox.checked) {
            debts.push({
                debtorId: debtorCheckbox.value,
                amount: moneyToCoins(debtors[i].querySelector(".debt_amount").value)
            })
        }
        
    }

    const receipt = {
        payerId: receiptsPayerSelect.value,
        amount: moneyToCoins(amount),
        description: receiptsDescriptionInput.value,
        debts
	}

    fetch('/receipts', {
        method: 'POST',
        body: JSON.stringify(receipt),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then((response) => {
        return response.json();
    })
    .then((data) => {
		console.log('add new receipt: ', data)
        playSuccessAnimation()
        addReceiptButton.disabled = false
	    addReceiptButton.innerHTML = "Оплатить счет"
        addReceiptButton.classList.remove('disabled')
        receiptsAmountInput.value = null
        receiptsDescriptionInput.value = null
    })
    .catch(e => console.error(e))
}


function moneyToCoins(money) {
    money = Number(money) * 100
    return money.toFixed()
}

function divideMoneyAmongUsers() {
    const amount = receiptsAmountInput.value
    if(!amount) return
    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor input:checked")
    const debtorAmount = (amount / debtors.length).toFixed(2)
    console.log(debtorAmount)
    for (let i = 0; i < debtors.length; i++) {
        debtors[i].parentElement.parentElement.querySelector(".debt_amount").value = debtorAmount
    }
    calculateReceiptRemainBalance()
}

function calculateReceiptRemainBalance() {

    const amount = receiptsAmountInput.value
    if(!amount) {
        errorMessage.innerHTML = 'Остаток: 0 грн'
        errorMessage.classList.remove('red_color')
        return
    } 
    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor input:checked")
    let debtorsSum = 0
    for (let i = 0; i < debtors.length; i++) {
        debtorsSum += Number(debtors[i].parentElement.parentElement.querySelector(".debt_amount").value)
    }
    if(debtorsSum != amount) {
        errorMessage.innerHTML = `Остаток: ${(amount - debtorsSum).toFixed(2)} грн`
        errorMessage.classList.add('red_color')
    } else {
        errorMessage.innerHTML = 'Остаток: 0 грн'
        errorMessage.classList.remove('red_color')
    }
}

function playSuccessAnimation() {
    fullscreenAnimationContainer.classList.add('active')
    setTimeout(() => fullscreenAnimationContainer.classList.remove('active'), 6000);
}