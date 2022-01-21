const fullscreenAnimationContainer = document.getElementById('fullscreen_animation_container')

function renderUsersSelect(selectElement) {
    let selectHtml = ``
    for (let i = 0; i < users.length; i++) {
        selectHtml += `<option ${i == 0 ? 'selected': ''} value="${users[i].id}">${users[i].name}</option>`
    }
    selectElement.innerHTML = selectHtml
}

function playSuccessAnimation() {
    fullscreenAnimationContainer.classList.add('active')
    setTimeout(() => fullscreenAnimationContainer.classList.remove('active'), 6000);
}

function moneyToCoins(money) {
    money = Number(money) * 100
    return money.toFixed()
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