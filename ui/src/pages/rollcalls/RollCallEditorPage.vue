<template>
  <template v-if="loading">
    <q-spinner
      class="fixed-center"
      color="primary"
      size="3em"
    />
  </template>

  <template v-else>
    <q-form
      @submit="onSubmit"
      class="q-gutter-md"
    >
      <div>
        <q-input
          filled
          v-model="messagePattern"
          label="Шаблон переклички"
        />
      </div>

      <h5 class="q-mb-xs">Учасники</h5>

      <div>
        <q-checkbox v-model="excludeSender" label="Виключити відправника" />
      </div>

      <div>
        <q-checkbox v-model="useAllUsers" label="Усі учасники" />
      </div>

      <div v-if="!useAllUsers">
        <q-select
          filled
          v-model="users"
          multiple
          :options="userOptions"
          label="Учасники"
        />
      </div>

      <h5 class="q-mb-xs">Опитування</h5>

      <div>
        <q-checkbox v-model="attachPoll" label="Додати опитування" />
      </div>

      <div v-if="attachPoll">
        <h6 class="q-my-xs">Варіанти відповіді</h6>
        <div
          class="q-pt-sm"
          v-for="order in Math.max(2, providedPollOptions + 1)" v-bind:key="order">
          <q-input
            v-bind:filled="Boolean(order <= 2 || pollOptions[order - 1])"
            v-model="pollOptions[order - 1]"
            v-bind:label="(order > Math.max(2, providedPollOptions)) ? 'Додатковий варіант відповіді' : 'Варіант відповіді'"
          >
            <template v-if="order > 2 && order <= providedPollOptions" v-slot:append>
              <q-btn class="gt-xs" size="12px" flat dense round icon="delete" v-on:click="onPollOptionDelete(order - 1)"/>
            </template>
          </q-input>
        </div>
      </div>

      <div>
        <q-btn label="Зберегти" type="submit" color="primary"/>
      </div>
    </q-form>
  </template>
</template>

<script>
import { useQuasar } from 'quasar'
import { defineComponent, computed, ref } from 'vue'

export default defineComponent({
  name: 'RollCallEditorPage',
  setup () {
    const $q = useQuasar()

    const messagePattern = ref(null)
    const users = ref([])
    const useAllUsers = ref(true)
    const excludeSender = ref(true)
    const attachPoll = ref(false)
    const pollOptions = ref([])
    const providedPollOptions = computed(() => pollOptions.value.filter(Boolean).length)

    const onPollOptionDelete = (index) => {
      pollOptions.value.splice(index, 1)
    }

    return {
      loading: false,
      messagePattern,
      users,
      useAllUsers,
      excludeSender,
      attachPoll,
      pollOptions,
      providedPollOptions,
      onPollOptionDelete,

      userOptions: [
        { label: 'Антон', value: '1' },
        { label: 'Микита', value: '2' },
        { label: 'Віталій', value: '3' },
      ],

      onSubmit() {
        if (!messagePattern.value) {
          $q.notify({
            color: 'red-5',
            textColor: 'white',
            message: 'Введіть шаблон повідомлення для переклички'
          })
          return
        }

        if (!useAllUsers.value && users.value.length === 0) {
          $q.notify({
            color: 'red-5',
            textColor: 'white',
            message: 'Оберіть користувачів для переклички'
          })
          return
        }

        if (attachPoll.value && providedPollOptions.value < 2) {
          $q.notify({
            color: 'red-5',
            textColor: 'white',
            message: 'Потрібно хоча б два варіанти відповіді'
          })
          return
        }

        const rollCall = {
          messagePattern: messagePattern.value,
          usersPattern: useAllUsers.value ? '*' : users.value.map(user => user.value).join(','),
          excludeSender: excludeSender.value,
          pollOptions: attachPoll.value ? pollOptions.value : [],
        }

        console.log(rollCall)

        $q.notify({
          color: 'green-4',
          textColor: 'white',
          message: 'Зберігаємо...'
        })
      },
    }
  }
})
</script>
