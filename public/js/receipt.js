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
const divideMoneyButton = document.getElementById('divide_money_button')
const errorMessage = document.getElementById('error_message')
const pageTitle = document.getElementById('page_title')
const photoPopup = document.getElementById('photo_popup')
const photoPopupImage = document.getElementById('photo_popup_image')

let users = []
let receiptId = null
let hasPhoto = false
let hasPhotoBeenChanged = false

addReceiptButton.addEventListener('click', saveReceipt)
divideMoneyButton.addEventListener('click', divideMoneyAmongUsers)
receiptsAmountInput.addEventListener('input', calculateReceiptRemainBalance)
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
    const currentUser = getCurrentUser()

    users = await getUsers()
    users = users.sort((a) => a.id === currentUser.id ? -1 : 1)

    renderUsersSelect(receiptsPayerSelect, currentUser.id)
    renderDebtors()

    const query = new URLSearchParams(location.search)

    if (query.has('success')) {
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

            console.log('Editing receipt:', receipt)

            hasPhoto = receipt.hasPhoto
            receiptsPayerSelect.value = receipt.payerId
            receiptsAmountInput.value = (receipt.amount / 100).toFixed(2)
            receiptsDescriptionInput.value = receipt.description
            setDebts(receipt.debts)

            pageTitle.innerText = 'Редагувати чек'
            addReceiptButton.innerText = 'Редагувати чек'
            receiptsAmountInputLabel.innerText = '* Сума, грн'
        } catch (error) {
            console.error(error)
        }
    } else {
        setInterval(() => updateTotalSum(), 500)
        receiptsTotalSum.classList.remove('hidden')
        receiptsTip.classList.remove('hidden')
        setDebts([{
            debtorId: currentUser.id,
            amount: null,
        }])
    }

    refreshPhoto()
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

function renderDebtors() {
    let debtorsHtml = ``
    for (let i = 0; i < users.length; i++) {
        debtorsHtml += `<div class="debtor"><div>
        <input class="debtor_checkbox" type="checkbox" id="debtor${i}" name="debtor${i}" value="${users[i].id}">
        <label for="debtor${i}">${users[i].name}</label></div>
        <input class="debt_amount" type="number" placeholder="" oninput="calculateReceiptRemainBalance()">
    </div>`
    }
    receiptDebtorsContainer.innerHTML = debtorsHtml

    const debtors = document.querySelectorAll('.debtor')
    for (const debtor of debtors) {
        const debtorCheckbox = debtor.querySelector(".debtor_checkbox")
        const debtorInput = debtor.querySelector('input[type="number"]')

        debtorInput.placeholder = generateDebtorInputPlaceholder({ debtorCheckbox })

        debtorInput.addEventListener('focus', () => {
            if (!debtorCheckbox.checked) {
                debtorInput.blur()
                return
            }

            debtorInput.placeholder = generateDebtorInputPlaceholder({ debtorCheckbox, focused: true })
        })

        debtorInput.addEventListener('blur', () => {
            debtorInput.placeholder = generateDebtorInputPlaceholder({ debtorCheckbox })
        })

        debtorCheckbox.addEventListener('change', () => {
            debtorInput.placeholder = generateDebtorInputPlaceholder({ debtorCheckbox })
        })
    }
}

function generateDebtorInputPlaceholder({ debtorCheckbox, focused = false }) {
    if (!debtorCheckbox.checked) return ''
    if (focused) return '0.00'
    return '0.00 (заповнити пізніше)'
}

function saveReceipt() {
    const rawAmount = receiptsAmountInput.value
    if(!rawAmount) return

    addReceiptButton.disabled = true
	addReceiptButton.innerHTML = "Обробка..."
    addReceiptButton.classList.add('disabled')

    const debts = {}

    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor")
    for (let i = 0; i < debtors.length; i++) {
        const debtorCheckbox = debtors[i].querySelector(".debtor_checkbox")
        if(debtorCheckbox.checked) {
            const value = debtors[i].querySelector(".debt_amount").value
            debts[debtorCheckbox.value] = value ? moneyToCoins(value) : null
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
                console.log('response:', data)
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

function divideMoneyAmongUsers() {
    let amount = receiptsAmountInput.value
    if(!amount) return
    amount = Math.floor(amount * 100)

    const debtors = getCheckedUserIds()
    const debtorAmount = amount / debtors.length
    setDebts(debtors.map(debtorId => ({ debtorId, amount: debtorAmount })))
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
                debtors[i].querySelector(".debt_amount").value = (debt.amount / 100).toFixed(2)
            }
        } else {
            debtorCheckbox.checked = false
            debtors[i].querySelector(".debt_amount").value = ''
        }

        debtors[i].querySelector(".debt_amount").placeholder = generateDebtorInputPlaceholder({ debtorCheckbox })
    }
    calculateReceiptRemainBalance()
}

function calculateReceiptRemainBalance() {
    const amount = receiptsAmountInput.value
    if(!amount) {
        errorMessage.innerHTML = 'Залишок: 0 грн'
        errorMessage.classList.remove('red_color')
        return
    }

    const debtors = receiptDebtorsContainer.querySelectorAll(".debtor input:checked")
    let debtorsSum = 0
    for (let i = 0; i < debtors.length; i++) {
        debtorsSum += Number(debtors[i].parentElement.parentElement.querySelector(".debt_amount").value)
    }
    if (Math.abs(debtorsSum - amount) > 0.01) {
        errorMessage.innerHTML = `Залишок: ${(amount - debtorsSum).toFixed(2)} грн`
        errorMessage.classList.add('red_color')
    } else {
        errorMessage.innerHTML = 'Залишок: 0 грн'
        errorMessage.classList.remove('red_color')
    }
}