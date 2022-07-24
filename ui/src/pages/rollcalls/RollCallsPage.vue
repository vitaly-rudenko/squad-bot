<template>
  <template v-if="loadingGroups">
    <q-spinner
      class="fixed-center"
      color="primary"
      size="3em"
    />
  </template>

  <template v-else>
    <q-select
      class="q-mb-sm"
      filled
      v-model="group"
      :options="groupOptions"
      :label="group === null ? 'Оберіть групу' : 'Група'"
    />

    <template v-if="loadingItems">
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
              <q-item-label>{{index + 1}}. <b>"{{ item.messagePattern }}"</b></q-item-label>
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
                <q-btn :disable="index === 0" class="gt-xs" size="12px" flat dense round icon="keyboard_arrow_up" v-on:click="onMoveUp(item.id)"/>
                <q-btn :disable="index === items.length - 1" class="gt-xs" size="12px" flat dense round icon="keyboard_arrow_down" v-on:click="onMoveDown(item.id)"/>
                <q-btn class="gt-xs" size="12px" flat dense round icon="edit" v-on:click="onEdit(item.id)"/>
                <q-btn class="gt-xs" size="12px" flat dense round icon="delete" v-on:click="onDelete(item.id)"/>

                <div class="inline cursor-pointer lt-sm">
                  <div class="fit flex flex-center text-center non-selectable">
                    <q-btn size="12px" flat dense round icon="more_vert" />
                  </div>

                  <q-menu touch-position>
                    <q-list style="min-width: 200px">
                      <q-item v-if="index > 0" clickable v-close-popup v-on:click="onMoveUp(item.id)">
                        <q-item-section>Move Up</q-item-section>
                      </q-item>
                      <q-item v-if="index < items.length - 1" clickable v-close-popup v-on:click="onMoveDown(item.id)">
                        <q-item-section>Move Down</q-item-section>
                      </q-item>
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
</template>

<script>
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { defineComponent, ref, onMounted, onUpdated, watchEffect, watch } from 'vue'

const group1Items = [
  {
    id: '1',
    messagePattern: 'статус',
    usersPattern: '*',
    excludeSender: true,
    pollOptions: ['Все добре', 'Я у небезпеці!'],
    order: 1,
  },
  {
    id: '2',
    messagePattern: '@odesa',
    usersPattern: '123,456',
    excludeSender: false,
    pollOptions: [],
    order: 2,
  },
  {
    id: '3',
    messagePattern: '@ukraine',
    usersPattern: '123,456,789',
    excludeSender: false,
    pollOptions: [],
    order: 3,
  },
]

const group2Items = [
  {
    id: '2',
    messagePattern: '@ukraine',
    usersPattern: '*',
    excludeSender: false,
    pollOptions: [],
    order: 1,
  },
]

const group3Items = [
  {
    id: '1',
    messagePattern: 'привіт всім',
    usersPattern: '*',
    excludeSender: true,
    pollOptions: ['привіт!', 'я зайнятий'],
    order: 1,
  },
]

export default defineComponent({
  name: 'RollCallsPage',

  setup() {
    const $q = useQuasar()
    const $route = useRoute()
    const $router = useRouter()

    const loadingGroups = ref(false)
    const loadingItems = ref(false)
    const group = ref(null)
    const groupOptions = ref([])
    const items = ref([])
    const users = ref([])
    const usersPattern = ref('')

    function loadRollCalls(groupId) {
      console.log('Loading roll calls for', groupId)

      loadingItems.value = true

      setTimeout(() => {
        loadingItems.value = false

        if (groupId === '1') {
          items.value = group1Items
        }

        if (groupId === '2') {
          items.value = group2Items
        }

        if (groupId === '3') {
          items.value = group3Items
        }

        reorder()
      }, 1000)
    }

    watch(group, () => {
      if (group.value?.value) {
        const groupId = String(group.value.value)

        $router.replace({
          path: $route.path,
          query: { group_id: groupId }
        })

        loadRollCalls(groupId)
      } else if ($route.query.group_id) {
        loadRollCalls(String($route.query.group_id))
      }
    }, {
      immediate: true
    })

    onMounted(() => {
      loadingGroups.value = true

      setTimeout(() => {
        loadingGroups.value = false

        groupOptions.value = [
          { label: 'Твархів', value: 1 },
          { label: 'Травневськ', value: 2 },
          { label: 'Тестування ботів', value: 3 },
        ]
      }, 1000)
    })

    function reorder() {
      items.value.sort((a, b) => a.order - b.order)
    }

    function save() {
      $q.notify({
        color: 'green-4',
        textColor: 'white',
        message: 'Зберігаємо...',
      })
    }

    return {
      loadingGroups,
      loadingItems: loadingItems,
      group,
      groupOptions,
      items,
      users,
      usersPattern,
      parseUsers(usersPattern) {
        const userIds = usersPattern.split(',')
        return userIds
          .map(userId => this.users.find(user => user.id === userId) ?? { id: userId })
      },
      onEdit(id) {
        console.log('edit', id)
        this.$router.push({ path: `/rollcalls/edit/${id}` })
      },
      onDelete(id) {
        console.log('delete', id)
      },
      onMoveUp(id) {
        const item = items.value.find(i => i.id === id)
        const itemToSwapWith = items.value.find(i => i.order === item.order - 1)

        item.order--
        itemToSwapWith.order++

        reorder()
        save()
      },
      onMoveDown(id) {
        const item = items.value.find(i => i.id === id)
        const itemToSwapWith = items.value.find(i => i.order === item.order + 1)

        item.order++
        itemToSwapWith.order--

        reorder()
        save()
      }
    }
  },

  // methods: {
  //   onEdit(id) {
  //     console.log('edit', id)
  //     this.$router.push({ path: `/rollcalls/edit/${id}` })
  //   },
  //   onDelete(id) {
  //     console.log('delete', id)
  //   },
  //   parseUsers(usersPattern) {
  //     const userIds = usersPattern.split(',')
  //     return userIds
  //       .map(userId => this.users.find(user => user.id === userId) ?? { id: userId })
  //   },
  //   async load() {
  //     this.loading = true
  //     console.log('loading...')

  //     await new Promise(resolve => setTimeout(resolve, 100))

  //     this.loading = false
  //     this.users = [
  //       { id: '123', name: 'Антон' },
  //       { id: '456', name: 'Віталій' },
  //       { id: '789', name: 'Микита' },
  //     ]
  //     this.items = [
  //       {
  //         id: '1',
  //         messagePattern: 'статус',
  //         usersPattern: '*',
  //         excludeSender: true,
  //         pollOptions: ['Все добре', 'Я у небезпеці!']
  //       },
  //       {
  //         id: '2',
  //         messagePattern: '@odesa',
  //         usersPattern: '123,456,789',
  //         excludeSender: false,
  //         pollOptions: []
  //       },
  //     ]

  //     console.log('loaded!')
  //   }
  // }
})
</script>
