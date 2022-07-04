import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/rollcalls',
      name: 'rollCalls',
      component: () => import('../views/RollCalls.vue'),
    },
    {
      path: '/rollcalls/editor',
      name: 'rollCallEditor',
      component: () => import('../views/RollCallEditor.vue')
    },
  ]
})

export default router
