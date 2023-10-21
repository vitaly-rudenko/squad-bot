const fullscreenAnimationContainer = document.getElementById('fullscreen_animation_container')

function sortUsers(users, currentUser, recentlyInteractedUserIds) {
    const sortedUsers = []

    sortedUsers.push(users.find(u => u.id === currentUser.id))

    for (const userId of recentlyInteractedUserIds) {
        if (userId !== currentUser.id) {
            sortedUsers.push(users.find(u => u.id === userId))
        }
    }

    for (const user of users) {
        if (user.id !== currentUser.id && !recentlyInteractedUserIds.includes(user.id)) {
            sortedUsers.push(users.find(u => u.id === user.id))
        }
    }

    return sortedUsers
}

function renderUsersSelect(users, selectElement, selectedUserId = null) {
    const selectedIndex = selectedUserId && users.findIndex(u => u.id === selectedUserId) || 0

    let selectHtml = ``
    for (let i = 0; i < users.length; i++) {
        selectHtml += `<option ${i == selectedIndex ? 'selected': ''} value="${users[i].id}">${users[i].name}</option>`
    }
    selectElement.innerHTML = selectHtml
}

function playSuccessAnimation() {
    fullscreenAnimationContainer.classList.add('active')
    setTimeout(() => fullscreenAnimationContainer.classList.remove('active'), 6000)
}

function moneyToCoins(money) {
    money = Number(money) * 100
    return money.toFixed()
}

function renderAmount(money) {
    money = money / 100

    return money.toFixed(2).endsWith('00')
      ? money.toFixed(0)
      : money.toFixed(2)
}

async function getUsers() {
    const response = await fetch('/users', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...createAuthorizationHeader(),
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
    return `${day < 10 ? '0' + day : day}.${month < 10 ? '0' + month : month}.${year}`
}