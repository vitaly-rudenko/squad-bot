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
        receiptsHtml += `<div class="receipt_list_item">
        <div class="payer">
            <div>${getUserNameById(receipts[i].payerId)})</div>
            <div>${renderMoney(receipts[i].amount)} грн</div>
        </div>`

        for (let j = 0; j < receipts[i].debts.length; j++) {
            receiptsHtml += `<div class="debtor">
                <div>${getUserNameById(receipts[i].debts[j].debtorId)})</div>
                <div>${renderMoney(receipts[i].debts[j].amount)} грн</div>
            </div>`
        }
        receiptsHtml += `<div class="comment_item">
            <div>${receipts[i].description}</div>
            <div>${renderDate(new Date(receipts[i].createdAt))}</div>
        </div></div>`
    }
    receiptListContainer.innerHTML = receiptsHtml
}

function getUserNameById(userId) {
    const user = users.find(u => u.id == userId)
    if(user) return user.name
    else return `Хз кто это`
}