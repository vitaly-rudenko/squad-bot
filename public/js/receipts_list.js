const receiptListContainer = document.getElementById("receipt_list_container")

let users = []
let receipts = []

init()
async function init() {
    users = await getUsers()
    receipts = await getReceipts()
    showReceipts()
}

async function getReceipts() {
    const response = await fetch('/receipts', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    const receiptsData = await response.json()
    return receiptsData
}

function showReceipts() {
    let receiptsHtml = ``
    for (let i = 0; i < receipts.length; i++) {
        receiptsHtml += `<div class="receipt_list_item" onclick="toggleActiveItem(this)">
        <div class="payer">
            <div>${getUserNameById(receipts[i].payerId)}</div>
            <div>${renderMoney(receipts[i].amount)} грн</div>
        </div>`

        for (let j = 0; j < receipts[i].debts.length; j++) {
            receiptsHtml += `<div class="debtor">
                <div>${getUserNameById(receipts[i].debts[j].debtorId)}</div>
                <div>${renderMoney(receipts[i].debts[j].amount)} грн</div>
            </div>`
        }
        receiptsHtml += `<div class="comment_item">
            <div>${receipts[i].description}</div>
            <div>${renderDate(new Date(receipts[i].createdAt))}</div>
        </div>
        <div class="action_buttons_container">
                    <div class="action_buttons">
                        <div class="yellow_color">
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                                width="18" height="18"
                                viewBox="0 0 24 24"
                                style=" fill:#f5a300;">
                                <path d="M 18 2 L 15.585938 4.4140625 L 19.585938 8.4140625 L 22 6 L 18 2 z M 14.076172 5.9238281 L 3 17 L 3 21 L 7 21 L 18.076172 9.9238281 L 14.076172 5.9238281 z"></path>
                            </svg>
                            <div>Редактировать</div>
                        </div>
                        <div class="red_color">
                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                                width="18" height="18"
                                viewBox="0 0 24 24"
                                style=" fill:#d20d0d;">
                                <path d="M 10.806641 2 C 10.289641 2 9.7956875 2.2043125 9.4296875 2.5703125 L 9 3 L 4 3 A 1.0001 1.0001 0 1 0 4 5 L 20 5 A 1.0001 1.0001 0 1 0 20 3 L 15 3 L 14.570312 2.5703125 C 14.205312 2.2043125 13.710359 2 13.193359 2 L 10.806641 2 z M 4.3652344 7 L 5.8925781 20.263672 C 6.0245781 21.253672 6.877 22 7.875 22 L 16.123047 22 C 17.121047 22 17.974422 21.254859 18.107422 20.255859 L 19.634766 7 L 4.3652344 7 z"></path>
                            </svg>
                            <div onclick="deleteReceiptById('${receipts[i].id}')">Удалить</div>
                        </div>
                    </div>
                </div>
        </div>`
    }
    receiptListContainer.innerHTML = receiptsHtml
}

function deleteReceiptById(receiptId) {
    event.stopPropagation()

    if (!confirm("Удалить чек?")) return

    fetch(`/receipts/${receiptId}`, {
        method: 'DELETE'
    })
    .then((response) => {
		if(response.statusText == "OK") {
            console.log('receipt deleted')
            getReceipts().then((data) => {
               receipts = data
               showReceipts()
            })
            
        }
    })
    .catch(e => console.error(e))
}


function getUserNameById(userId) {
    const user = users.find(u => u.id == userId)
    if(user) return user.name
    else return `Хз кто это`
}

function toggleActiveItem(clickedElement) {
    clickedElement.classList.toggle("active")
}