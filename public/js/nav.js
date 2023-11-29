const navContainer = document.getElementById("nav_container")

const navHtml = `<input id="toggle" type="checkbox">
<label class="toggle-container" for="toggle">
    <span class="button button-toggle"></span>
</label>

<nav class="nav">
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/">Створити чек</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item nav-item--separated" href="/receiptslist">Переглянути чеки</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/paymentview">Створити платіж</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/paymentslist">Переглянути платежі</a>
</nav>`

navContainer.innerHTML = navHtml