const receiptsPayerSelect = document.getElementById("receipts_payer_select")
const receiptsAmountInput = document.getElementById("receipts_amount_input")
const receiptsAmountInputLabel = document.getElementById("receipts_amount_input_label")
const receiptsTotalSum = document.getElementById('receipts_total_sum')
const receiptsTip = document.getElementById('receipts_tip')
const receiptsTipAmountInput = document.getElementById('receipts_tip_amount_input')
const receiptsPhotoInput = document.getElementById("receipts_photo_input")
const receiptsAddPhotoButton = document.getElementById("receipts_add_photo_button")
const receiptsDeletePhotoButton = document.getElementById("receipts_delete_photo_button")
const receiptsOpenPhotoLink = document.getElementById("open_photo_link")
const receiptsDescriptionInput = document.getElementById("receipts_description_input")
const receiptDebtorsContainer = document.getElementById("receipt_debtors_container")
const addReceiptButton = document.getElementById("add_receipt_button")
const remainingBalanceLabel = document.getElementById('remaining_balance')
const splitRemainingBalanceEquallyContainer = document.getElementById('split_remaining_balance_equally_container')
const splitRemainingBalanceEquallyInput = document.getElementById('split_remaining_balance_equally')
const pageTitle = document.getElementById('page_title')
const photoPopup = document.getElementById('photo_popup')
const photoPopupImage = document.getElementById('photo_popup_image')

let currentUser
let recentlyInteractedUserIds = []
let users = []
let receiptId = null
let hasPhoto = false
let hasPhotoBeenChanged = false
let splitRemainingBalanceEqually = false

splitRemainingBalanceEquallyInput.addEventListener('change', () => {
    splitRemainingBalanceEqually = splitRemainingBalanceEquallyInput.checked
    updateReceiptRemainingBalance()
})
addReceiptButton.addEventListener('click', saveReceipt)
receiptsAmountInput.addEventListener('focus', () => receiptsAmountInput.select())
receiptsAmountInput.addEventListener('input', updateReceiptRemainingBalance)
receiptsTipAmountInput.addEventListener('focus', () => receiptsTipAmountInput.select())
receiptsPhotoInput.addEventListener('change', photoChange)
receiptsAddPhotoButton.addEventListener('click', addPhoto)
receiptsDeletePhotoButton.addEventListener('click', deletePhoto)
photoPopup.addEventListener('click', () => {
    photoPopup.classList.add('hidden')
})
receiptsOpenPhotoLink.addEventListener('click', () => {
    if (receiptId && !hasPhotoBeenChanged) {
        photoPopupImage.src = `/receipts/${receiptId}/photo`
        photoPopup.classList.remove('hidden')
    } else {
        const selectedFile = receiptsPhotoInput.files[0]
        const fileReader = new FileReader()

        fileReader.addEventListener('load', () => {
            const dataUrl = fileReader.result
            photoPopupImage.src = dataUrl
            photoPopup.classList.remove('hidden')
        })

        fileReader.readAsDataURL(selectedFile)
    }
})

init()
async function init() {
    await waitForAuth()
    currentUser = getCurrentUser()
    recentlyInteractedUserIds = await getRecentlyInteractedUserIds()

    users = sortUsers(await getUsers(), currentUser, recentlyInteractedUserIds)

    renderUsersSelect(users, receiptsPayerSelect, currentUser.id)

    const query = new URLSearchParams(location.search)
    if (query.has('success')) {
        query.delete('success')

        const url = new URL(window.location.href)
        url.search = query.toString()
        history.pushState({}, '', url.toString())

        playSuccessAnimation()
    }

    pageTitle.innerText = 'Створити чек'
    addReceiptButton.innerText = 'Створити чек'

    if (query.has('receipt_id')) {
        try {
            const queryReceiptId = query.get('receipt_id')
            const receipt = await (await fetch(`/receipts/${queryReceiptId}`, {
                headers: createAuthorizationHeader(),
            })).json()
            receiptId = queryReceiptId

            hasPhoto = receipt.hasPhoto
            receiptsPayerSelect.value = receipt.payerId
            receiptsAmountInput.value = renderAmount(receipt.amount)
            receiptsDescriptionInput.value = receipt.description

            pageTitle.innerText = 'Редагувати чек'
            addReceiptButton.innerText = 'Редагувати чек'
            receiptsAmountInputLabel.innerText = '* Сума, грн'

            renderDebtors(receipt.debts)
            setDebts(receipt.debts)
        } catch (error) {
            console.error(error)
        }
    } else {
        receiptsTotalSum.classList.remove('hidden')
        receiptsTip.classList.remove('hidden')

        const debts = [{
            debtorId: currentUser.id,
            amount: null,
        }]
        renderDebtors(debts)
        setDebts(debts)
    }

    setInterval(() => update(), 500)
    refreshPhoto()
}

function update() {
    updateTotalSum()
    updateDebtInputPlaceholders()
    updateReceiptRemainingBalance()
}

function updateTotalSum() {
    const amount = Number(moneyToCoins(receiptsAmountInput.value || '0'))
    const tipAmount = Number(moneyToCoins(receiptsTipAmountInput.value || '0'))
    const total = (Number(amount) + Number(tipAmount)) / 100

    receiptsTotalSum.innerText = `${total} грн`
}

function photoChange() {
    hasPhoto = Boolean(receiptsPhotoInput.value)
    hasPhotoBeenChanged = true
    refreshPhoto()
}

function addPhoto() {
    receiptsPhotoInput.click()
}

function deletePhoto() {
    if (!confirm("Видалити фото?")) return

    receiptsPhotoInput.value = ''
    hasPhoto = false
    hasPhotoBeenChanged = true
    refreshPhoto()
}

function refreshPhoto() {
    if (hasPhoto) {
        receiptsAddPhotoButton.classList.add('hidden')
        receiptsDeletePhotoButton.classList.remove('hidden')
        receiptsOpenPhotoLink.classList.remove('hidden')
    } else {
        receiptsAddPhotoButton.classList.remove('hidden')
        receiptsDeletePhotoButton.classList.add('hidden')
        receiptsOpenPhotoLink.classList.add('hidden')
    }
}

function renderDebtors(debts) {
    const shownUsers = new Set()
    const hiddenUsers = new Set()
    shownUsers.add(users.find(u => u.id === currentUser.id))
    for (const debt of debts) {
        const user = users.find(u => u.id === debt.debtorId)
        if (user) shownUsers.add(user)
    }
    for (const userId of recentlyInteractedUserIds) {
        const user = users.find(u => u.id === userId)
        if (user) shownUsers.add(user)
    }
    for (const user of users) {
        if (!shownUsers.has(user)) {
            hiddenUsers.add(user)
        }
    }

    let debtorsHtml = ``
    for (const user of shownUsers) {
        debtorsHtml += renderDebtor(user)
    }
    if (hiddenUsers.size > 0) {
        debtorsHtml += `<button class="toggle_debtors_hidden_container">Показати всіх користувачів</button>`
        debtorsHtml += `<div class="receipt_debtors_container__hidden hidden">`
        for (const user of hiddenUsers) {
            debtorsHtml += renderDebtor(user)
        }
        debtorsHtml += `</div>`
    }
    receiptDebtorsContainer.innerHTML = debtorsHtml

    const toggleDebtorsHiddenContainer = document.querySelector('.toggle_debtors_hidden_container')
    const hiddenDebtorsContainer = document.querySelector('.receipt_debtors_container__hidden')
    if (toggleDebtorsHiddenContainer) {
        toggleDebtorsHiddenContainer.addEventListener('click', () => {
            if (hiddenDebtorsContainer?.classList.contains('hidden')) {
                hiddenDebtorsContainer.classList.remove('hidden')
                toggleDebtorsHiddenContainer.innerHTML = 'Приховати інших користувачів'
            } else {
                hiddenDebtorsContainer.classList.add('hidden')
                toggleDebtorsHiddenContainer.innerHTML = 'Показати інших користувачів'
            }
        })
    }

    const debtors = document.querySelectorAll('.debtor')
    for (const debtor of debtors) {
        const debtorCheckbox = debtor.querySelector(".debtor_checkbox")
        const debtorInput = debtor.querySelector('input[type="number"]')

        debtorInput.addEventListener('focus', () => {
            if (!debtorCheckbox.checked) {
                debtorInput.blur()
                return
            }

            debtorInput.select()
            updateDebtInputPlaceholders()
        })

        debtorInput.addEventListener('blur', () => {
            if (Number(debtorInput.value) <= 0) debtorInput.value = ''
            updateDebtInputPlaceholders()
        })

        debtorCheckbox.addEventListener('change', () => {
            if (!debtorCheckbox.checked) {
                debtorInput.value = ''
            }

            updateDebtInputPlaceholders()
            updateReceiptRemainingBalance()
        })
    }

    updateDebtInputPlaceholders()
}

function renderDebtor(debtor) {
    return `<div class="debtor" data-debtor-id="${debtor.id}">
        <div>
            <input class="debtor_checkbox" type="checkbox" id="debtor_${debtor.id}" name="debtor_${debtor.id}" value="${debtor.id}">
            <label for="debtor_${debtor.id}">${debtor.name}</label>
        </div>
        <input class="debt_amount" type="number" placeholder="" oninput="updateReceiptRemainingBalance()">
    </div>`
}

function generateDebtorInputPlaceholder({ leftoverAmount = undefined, debtorCheckbox, focused = false }) {
    if (debtorCheckbox !== true && !debtorCheckbox.checked) return ''
    if (leftoverAmount) return renderAmount(leftoverAmount)
    if (splitRemainingBalanceEqually) return ''
    if (focused) return '0.00'
    return '0.00 (заповнити пізніше)'
}

function saveReceipt() {
    const rawAmount = receiptsAmountInput.value
    if(!rawAmount) return

    addReceiptButton.disabled = true
	addReceiptButton.innerHTML = "Обробка..."
    addReceiptButton.classList.add('disabled')

    const { leftoverAmount, remainingAmount } = calculateRemainingBalance()

    const debts = {}
    const debtors = [...receiptDebtorsContainer.querySelectorAll(".debtor")]
        .filter(debtor => debtor.querySelector(".debtor_checkbox").checked)

    const remainingAmountPerDebtor = (splitRemainingBalanceEqually && remainingAmount)
        ? Math.trunc(Number(remainingAmount) / debtors.length)
        : null

    const lastRemainingCoin = remainingAmountPerDebtor
        ? (Number(remainingAmount) - remainingAmountPerDebtor * debtors.length)
        : null

    for (const [i, debtor] of debtors.entries()) {
        const debtorId = debtor.dataset.debtorId
        const rawAmount = debtor.querySelector(".debt_amount").value
        const value = rawAmount ? moneyToCoins(rawAmount) : leftoverAmount

        if (remainingAmountPerDebtor) {
            const calculatedLastRemainingCoin = (i === 0 && lastRemainingCoin) ? lastRemainingCoin : 0
            debts[debtorId] = String(Number(value || 0) + remainingAmountPerDebtor + calculatedLastRemainingCoin)
        } else {
            debts[debtorId] = value || null
        }
    }

    const photo = receiptsPhotoInput.files[0]

    const payerId = receiptsPayerSelect.value
    const amount = moneyToCoins(rawAmount)
    const description = receiptsDescriptionInput.value

    let promise = Promise.resolve()
    promise = promise.then(() => sendCreateReceiptRequest({
        payerId,
        amount,
        debts,
        description,
        photo,
        leavePhoto: hasPhoto,
    }))

    const rawTipAmount = receiptsTipAmountInput.value
    if (rawTipAmount && Number(rawTipAmount) > 0) {
        const debtorIds = Object.keys(debts)
        const tipAmount = moneyToCoins(rawTipAmount)
        const tipAmountPerDebtor = Math.floor(tipAmount / debtorIds.length)

        const tipDebts = {}
        for (const debtorId of debtorIds) {
            tipDebts[debtorId] = tipAmountPerDebtor
        }

        promise.then(() => sendCreateReceiptRequest({
            payerId,
            amount: tipAmount,
            debts: tipDebts,
            description: description ? `${description} (чайові)` : `Чайові`,
            photo: null,
            leavePhoto: false,
        }))
    }

    promise
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            if (!data.id) {
                throw new Error('Response does not contain receipt ID!')
            }

            localStorage.setItem('success', 'true')
            window.history.replaceState(null, null, window.location.pathname + '?success')

            if (receiptId) {
                window.open('/receiptslist', '_self')
            } else {
                location.reload()
            }
        })
        .catch(e => console.error(e))
}

function sendCreateReceiptRequest({ payerId, amount, debts, description, photo, leavePhoto }) {
    const body = new FormData()
    body.set('payer_id', payerId)
    body.set('amount', amount)
    body.set('debts', JSON.stringify(debts))

    if (receiptId) {
        body.set('id', receiptId)
    }

    if (description) {
        body.set('description', description)
    }

    if (photo) {
        body.set('photo', photo, photo.name)
    } else if (leavePhoto) {
        body.set('leave_photo', 'true')
    }

    return fetch('/receipts', {
        method: 'POST',
        headers: createAuthorizationHeader(),
        body,
    })
}

function getCheckedUserIds() {
    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor")
    return [...debtors]
        .filter(debtor => debtor.querySelector(".debtor_checkbox").checked)
        .map(debtor => debtor.querySelector(".debtor_checkbox").value)
}

function setDebts(debts) {
    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor")
    for (let i = 0; i < debtors.length; i++) {
        const debtorCheckbox = debtors[i].querySelector(".debtor_checkbox")
        const debtorId = debtorCheckbox.value
        const debt = debts.find(debt => debt.debtorId === debtorId)

        if (debt) {
            debtorCheckbox.checked = true
            if (debt.amount) {
                debtors[i].querySelector(".debt_amount").value = renderAmount(debt.amount)
            }
        } else {
            debtorCheckbox.checked = false
            debtors[i].querySelector(".debt_amount").value = ''
        }

        debtors[i].querySelector(".debt_amount").placeholder = generateDebtorInputPlaceholder({ debtorCheckbox })
    }
    updateReceiptRemainingBalance()
}

function updateReceiptRemainingBalance() {
    const { remainingAmount = '0' } = calculateRemainingBalance()
    remainingBalanceLabel.innerHTML = `Залишок: ${renderAmount(remainingAmount)} грн`

    if (remainingAmount === '0' || splitRemainingBalanceEqually) {
        remainingBalanceLabel.classList.remove('remaining_balance_warning')
    } else {
        remainingBalanceLabel.classList.add('remaining_balance_warning')
    }

    if (Number(remainingAmount) <= 0) {
        splitRemainingBalanceEquallyContainer.classList.add('hidden')
    } else {
        splitRemainingBalanceEquallyContainer.classList.remove('hidden')
    }
}

function updateDebtInputPlaceholders() {
    const { leftoverAmount } = calculateRemainingBalance()

    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor")

    for (const debtor of debtors) {
        const debtorCheckbox = debtor.querySelector(".debtor_checkbox")
        const debtorInput = debtor.querySelector('input[type="number"]')

        debtorInput.placeholder = generateDebtorInputPlaceholder({
            debtorCheckbox,
            focused: document.activeElement === debtorInput,
            leftoverAmount,
        })
    }
}

function calculateRemainingBalance() {
    const amount = receiptsAmountInput.value
    if (!amount) return {}

    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor input:checked")
    let debtorsSum = 0
    let unfilledDebtors = 0
    for (let i = 0; i < debtors.length; i++) {
        const debtorInput = debtors[i].parentElement.parentElement.querySelector(".debt_amount")
        const amount = Number(debtorInput.value)

        if (amount > 0) {
            debtorsSum += amount
        } else {
            unfilledDebtors++
        }
    }

    const isRemaining = Math.abs(debtorsSum - amount) >= 0.01
    const remainingAmount = isRemaining ? (amount - debtorsSum).toFixed(2) : '0'

    if (unfilledDebtors === 1) {
        return { leftoverAmount: moneyToCoins(remainingAmount) }
    }

    return { remainingAmount: moneyToCoins(remainingAmount) }
}
