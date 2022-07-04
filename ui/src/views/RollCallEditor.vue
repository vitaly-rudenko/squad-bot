<script setup>
</script>

<template>
  <main>
    <div class="navigation">
      <div class="navigation__button">← Назад</div>
    </div>
    <div class="roll-call-editor">
      <h1>Створити перекличку</h1>
      <form class="form">
        <h2>Шаблон повідомлення</h2>
        <div class="form-input form-input--text">
          <input id="messagePattern" type="text" value="Агов!">
        </div>
        <h2>Учасники переклички</h2>
        <div class="form-input form-input--checkbox">
          <input id="excludeSender" type="checkbox"/>
          <label for="excludeSender">Виключити відправника</label>
        </div>
        <div class="form-input form-input--checkbox">
          <input id="useAllUsers" type="checkbox"/>
          <label for="useAllUsers">Усі користувачі чату</label>
        </div>
        <h2>Опитування</h2>
        <div class="form-input form-input--checkbox">
          <input id="attachPoll" type="checkbox"/>
          <label for="attachPoll">Додати опитування</label>
        </div>
        <div class="form-input form-input--text">
          <input id="pollOption1" type="text" value="Шо?">
        </div>
        <div class="form-input form-input--text">
          <input id="pollOption2" type="text" value="Привіт">
        </div>
        <div class="form-input form-input--text">
          <input id="pollOption3" type="text" value="Вога!">
        </div>
      </form>
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
  padding: 15px;
  max-width: 600px;
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

/* --- roll call editor */

h1 {
  font-weight: normal;
  font-size: 28px;
  margin: 0px 0px 15px 0px;
}

h2 {
  font-size: 20px;
  margin: 5px 0px 15px 0px;
}

.form {
  display: flex;
  flex-direction: column;
}
.form > *:not(:last-child) {
  margin-bottom: 15px;
}

.form-input {
  display: flex;
}

.form-input--text {
  flex-direction: column;
}
.form-input--text input {
  border: none;
  background-color: #3e5d68;
  border-radius: 10px;
  padding: 15px;
}

.form-input--checkbox label {
  margin-left: 15px;
}
</style>