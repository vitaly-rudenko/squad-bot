const paymentsFromUserSelect = document.getElementById("payments_from_user_select")
const paymentsToUserSelect = document.getElementById("payments_to_user_select")
const receiptsPayerSelect = document.getElementById("receipts_payer_select")
const paymentsAmountInput = document.getElementById("payments_amount_input")
const savePaymentButton = document.getElementById("save_payment_button")

const receiptsAmountInput = document.getElementById("receipts_amount_input")
const receiptsDescriptionInput = document.getElementById("receipts_description_input")
const receiptDebtorsContainer = document.getElementById("receipt_debtors_container")
const addReceiptButton = document.getElementById("add_receipt_button")

let users = []

savePaymentButton.addEventListener('click', savePayment)
addReceiptButton.addEventListener('click', saveReceipt)

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
        debtorsHtml += `<div class="debtor">
        <input class="debtor_checkbox" type="checkbox" checked id="debtor${i}" name="debtor${i}" value="${users[i].id}">
        <label for="debtor${i}">${users[i].name}</label>
        <input class="debt_amount" type="number" placeholder="0.00">
    </div>`
    }
    receiptDebtorsContainer.innerHTML = debtorsHtml
}

function savePayment() {
    const amount = paymentsAmountInput.value
    if(!amount) return

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
    })
    .catch(e => console.error(e))
}


function saveReceipt() {
    const amount = receiptsAmountInput.value
    if(!amount) return

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
    })
    .catch(e => console.error(e))
}


function moneyToCoins(money) {
    money = Number(money) * 100
    return money.toFixed()
  }
  