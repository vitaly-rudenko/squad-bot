const receiptsPayerSelect = document.getElementById("receipts_payer_select")
const receiptsAmountInput = document.getElementById("receipts_amount_input")
const receiptsDescriptionInput = document.getElementById("receipts_description_input")
const receiptDebtorsContainer = document.getElementById("receipt_debtors_container")
const addReceiptButton = document.getElementById("add_receipt_button")
const divideMoneyButton = document.getElementById('divide_money_button')
const errorMessage = document.getElementById('error_message')

let users = []

addReceiptButton.addEventListener('click', saveReceipt)
divideMoneyButton.addEventListener('click', divideMoneyAmongUsers)
receiptsAmountInput.addEventListener('input', calculateReceiptRemainBalance)

init()
async function init() {
    users = await getUsers()
    renderUsersSelect(receiptsPayerSelect)
    renderDebtors()
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