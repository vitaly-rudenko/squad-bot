<template>
  <template v-if="loading">
    <q-spinner
      class="fixed-center"
      color="primary"
      size="3em"
    />
  </template>

  <template v-else>
    <q-list>
      <template v-for="(item, index) in items" v-bind:key="item.id">
        <template v-if="index > 0">
          <q-separator spaced inset />
        </template>

        <q-item>
          <q-item-section>
            <q-item-label><b>{{ item.messagePattern }}</b></q-item-label>
            <q-item-label caption>
              <template v-if="item.usersPattern === '*'">
                <b>Усі користувачі</b>
              </template>
              <template v-else>
                <template v-for="(user, index) in parseUsers(item.usersPattern)" v-bind:key="user.id">
                  <template v-if="index > 0">, </template>
                  <b>{{ user.name ?? user.id }}</b>
                </template>
              </template>
              <template v-if="item.excludeSender"> окрім відправника</template>
            </q-item-label>
            <q-item-label caption>
              <template v-if="item.pollOptions.length === 0">
                Без опитування
              </template>

              <template v-else>
                Опитування:
                <template v-for="(option, index) in item.pollOptions" v-bind:key="index">
                  <template v-if="index > 0">; </template>
                  <i>{{ option }}</i>
                </template>
              </template>
            </q-item-label>
          </q-item-section>

          <q-item-section top side>
            <div class="text-grey-8 q-gutter-xs">
              <q-btn class="gt-xs" size="12px" flat dense round icon="edit" v-on:click="onEdit(item.id)"/>
              <q-btn class="gt-xs" size="12px" flat dense round icon="delete" v-on:click="onDelete(item.id)"/>

              <div class="inline cursor-pointer lt-sm">
                <div class="fit flex flex-center text-center non-selectable">
                  <q-btn size="12px" flat dense round icon="more_vert" />
                </div>

                <q-menu touch-position>
                  <q-list style="min-width: 100px">
                    <q-item clickable v-close-popup v-on:click="onEdit(item.id)">
                      <q-item-section>Edit</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup v-on:click="onDelete(item.id)">
                      <q-item-section>Delete</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </div>
            </div>
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </template>
</template>

<script>
import router from 'src/router'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'RollCallsPage',
  data() {
    return {
      items: [],
      loading: false,
    }
  },
  created() {
    this.load()
  },
  methods: {
    onEdit(id) {
      console.log('edit', id)
      this.$router.push({ path: `/rollcalls/${id}` })
    },
    onDelete(id) {
      console.log('delete', id)
    },
    parseUsers(usersPattern) {
      const userIds = usersPattern.split(',')
      return userIds
        .map(userId => this.users.find(user => user.id === userId) ?? { id: userId })
    },
    async load() {
      this.loading = true
      console.log('loading...')

      await new Promise(resolve => setTimeout(resolve, 100))

      this.loading = false
      this.users = [
        { id: '123', name: 'Антон' },
        { id: '456', name: 'Віталій' },
        { id: '789', name: 'Микита' },
      ]
      this.items = [
        {
          id: '1',
          messagePattern: 'статус',
          usersPattern: '*',
          excludeSender: true,
          pollOptions: ['Все добре', 'Я у небезпеці!']
        },
        {
          id: '2',
          messagePattern: '@odesa',
          usersPattern: '123,456,789',
          excludeSender: false,
          pollOptions: []
        },
      ]

      console.log('loaded!')
    }
  }
})
</script>
