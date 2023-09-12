const paymentsListContainer = document.getElementById("payments_list_container")

let users = []
let payments = []

init()
async function init() {
    await waitForAuth()
    users = await getUsers()
    payments = await getPayments()
    showPayments()
}

async function getPayments() {
    const response = await fetch('/payments', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...createAuthorizationHeader(),
        }
    })
    const paymentsData = await response.json()
    return paymentsData
}

function showPayments() {
    let paymentsHtml = ``
    for (let i = 0; i < payments.length; i++) {
        paymentsHtml += `<div class="payment_list_item" onclick="toggleActiveItem(this)">
        <img src="/static/img/payment_arrow.png">
        <div class="main">
            <div>
                <div class="from_user">${getUserNameById(payments[i].fromUserId)}</div>
                <div class="to_user">${getUserNameById(payments[i].toUserId)}</div>
            </div>
            <div>
                <div class="amount">${renderAmount(payments[i].amount)} грн</div>
                <div class="date">${renderDate(new Date(payments[i].createdAt))}</div>
            </div>
        </div>

        <div class="action_buttons_container">
                    <div class="action_buttons">
                        <!-- <div class="yellow_color">
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                                width="18" height="18"
                                viewBox="0 0 24 24"
                                style=" fill:#f5a300;">
                                <path d="M 18 2 L 15.585938 4.4140625 L 19.585938 8.4140625 L 22 6 L 18 2 z M 14.076172 5.9238281 L 3 17 L 3 21 L 7 21 L 18.076172 9.9238281 L 14.076172 5.9238281 z"></path>
                            </svg>
                            <div>Редагувати</div>
                        </div> -->
                        <div class="red_color">
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                                width="18" height="18"
                                viewBox="0 0 24 24"
                                style=" fill:#d20d0d;">
                                <path d="M 10.806641 2 C 10.289641 2 9.7956875 2.2043125 9.4296875 2.5703125 L 9 3 L 4 3 A 1.0001 1.0001 0 1 0 4 5 L 20 5 A 1.0001 1.0001 0 1 0 20 3 L 15 3 L 14.570312 2.5703125 C 14.205312 2.2043125 13.710359 2 13.193359 2 L 10.806641 2 z M 4.3652344 7 L 5.8925781 20.263672 C 6.0245781 21.253672 6.877 22 7.875 22 L 16.123047 22 C 17.121047 22 17.974422 21.254859 18.107422 20.255859 L 19.634766 7 L 4.3652344 7 z"></path>
                            </svg>
                            <div onclick="deletePaymentById('${payments[i].id}')">Видалити</div>
                        </div>
                    </div>
                </div>
        </div>`
    }
    paymentsListContainer.innerHTML = paymentsHtml
}

async function deletePaymentById(paymentId) {
    if (!confirm("Видалити платіж?")) return

    const response = await fetch(`/payments/${paymentId}`, {
        method: 'DELETE',
        headers: createAuthorizationHeader()
    })

    if(response.status === 204) {
        payments = await getPayments()
        showPayments()
    }
}

function getUserNameById(userId) {
    const user = users.find(u => u.id == userId)
    if(user) return user.name
    else return `?`
}

function toggleActiveItem(clickedElement) {
    clickedElement.classList.toggle("active")
}