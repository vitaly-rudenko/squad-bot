const paymentsFromUserSelect = document.getElementById("payments_from_user_select")
const paymentsToUserSelect = document.getElementById("payments_to_user_select")
const receiptsPayerSelect = document.getElementById("receipts_payer_select")
const paymentsAmountInput = document.getElementById("payments_amount_input")
const savePaymentButton = document.getElementById("save_payment_button")

let users = []

savePaymentButton.addEventListener('click', savePayment)

async function init() {
    users = await getUsers()
    renderUsersSelect(paymentsFromUserSelect)
    renderUsersSelect(paymentsToUserSelect)
    renderUsersSelect(receiptsPayerSelect)
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
    selectElement.innerHtml = selectHtml
}

function savePayment() {
    const amount = paymentsAmountInput.value
    if(!amount) return

    const payment = {
        fromUserId: paymentsFromUserSelect.value,
		toUserId: paymentsToUserSelect.value,
		amount: sum
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