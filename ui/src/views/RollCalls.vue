<script setup>
</script>

<template>
  <main>
    <div class="navigation">
      <div class="navigation__button navigation__button--active">Чеки</div>
      <div class="navigation__button">Платежі</div>
      <div class="navigation__button">Переклички</div>
    </div>
    <div class="fab">
      <span>+</span>
    </div>
    <div class="roll-calls">
      <div class="roll-call">
        <div class="roll-call__menu-button">...</div>
        <div class="roll-call__message-pattern">"статус"</div>
        <div class="roll-call__users">
          <b>усі користувачі</b> окрім відправника
        </div>
        <div class="roll-call__poll-options">
          опитування: <i>все добре</i>, <i>я у небезпеці</i>
        </div>
      </div>

      <div class="roll-call">
        <div class="roll-call__menu-button">...</div>
        <div class="roll-call__message-pattern">"@odesa"</div>
        <div class="roll-call__users">
          <b>Віталій</b>, <b>Антон</b>, <b>Влад</b> окрім відправника
        </div>
        <div class="roll-call__poll-options">
          без опитування
        </div>
      </div>
    </div>
  </main>
</template>

<style>
html, body {
  padding: 0px;
  margin: 0px;
}

body {
  background-color: #3a3c3d;
}

* {
  color: white;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  font-size: 16px;
}

/* --- */

main {
  max-width: 600px;
  padding: 15px;
}

/* --- navigation */

.navigation {
  display: flex;
  background-color: #59757f;
  padding: 15px;
  overflow: scroll;
  border-radius: 15px;
  margin-bottom: 30px;
}

.navigation__button {
  font-size: 28px;
}

.navigation__button--active {
  text-decoration: underline;
}

.navigation > .navigation__button:not(:last-child) {
  margin-right: 30px;
}

.fab {
  position: fixed;
  bottom: 15px;
  right: 15px;

  width: 60px;
  height: 60px;
  background-color: #59757f;
  border-radius: 30px;

  display: flex;
  align-items: center;
  justify-content: center;
}

.fab span {
  font-size: 28px;
}

/* --- roll calls */

.roll-calls {
  display: flex;
  flex-direction: column;
}

.roll-calls > .roll-call:not(:last-child) {
  margin-bottom: 30px;
}

.roll-call {
  display: flex;
  flex-direction: column;
  background-color: #3e5d68;
  padding: 15px;
  overflow: scroll;
  border-radius: 15px;
  margin-bottom: 30px;
  position: relative;
}

.roll-call__menu-button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;

  width: 30px;
  height: 30px;
}

.roll-call__message-pattern {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
}

.roll-call__users {
  margin-bottom: 10px;
}

</style>