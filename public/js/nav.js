const navContainer = document.getElementById("nav_container")

const navHtml = `<input id="toggle" type="checkbox">
<label class="toggle-container" for="toggle">
    <span class="button button-toggle"></span>
</label>

<nav class="nav">
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/">Добавить чек</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/paymentview">Добавить перевод</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/receiptslist">Все чеки</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/paymentslist">Все переводы</a>
</nav>`

navContainer.innerHTML = navHtml