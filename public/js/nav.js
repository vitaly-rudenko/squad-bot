const navContainer = document.getElementById("nav_container")

const navHtml = `<input id="toggle" type="checkbox">
<label class="toggle-container" for="toggle">
    <span class="button button-toggle"></span>
</label>

<nav class="nav">
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/">Додати чек</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/paymentview">Додати переказ</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/receiptslist">Усі чеки</a>
    <a rel="nofollow" rel="noreferrer" class="nav-item" href="/paymentslist">Усі перекази</a>
</nav>`

navContainer.innerHTML = navHtml