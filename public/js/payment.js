const paymentsFromUserSelect = document.getElementById("payments_from_user_select")
const paymentsToUserSelect = document.getElementById("payments_to_user_select")
const paymentsAmountInput = document.getElementById("payments_amount_input")
const savePaymentButton = document.getElementById("save_payment_button")

savePaymentButton.addEventListener('click', savePayment)

let users = []

init()
async function init() {
    users = await getUsers()
    renderUsersSelect(paymentsFromUserSelect)
    renderUsersSelect(paymentsToUserSelect)
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