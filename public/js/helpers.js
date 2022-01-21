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

function renderMoney(money) {
    money = money / 100

    return money.toFixed(2).endsWith('00')
      ? money.toFixed(0)
      : money.toFixed(2)
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

function renderDate(myDate) {
    const day = myDate.getDate()
    const year = myDate.getFullYear()
    const month = myDate.getMonth() + 1
    //19.02.2021
    return `${day < 10 ? '0' + day : day} ${month < 10 ? '0' + month : month} ${year}`
}