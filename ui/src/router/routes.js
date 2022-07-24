
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
    ]
  },
  {
    path: '/receipts',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/ReceiptsPage.vue') },
    ]
  },
  {
    path: '/payments',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/PaymentsPage.vue') },
    ]
  },
  {
    path: '/rollcalls',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: 'edit/:id', component: () => import('pages/rollcalls/RollCallEditorPage.vue') },
      { path: 'create', component: () => import('pages/rollcalls/RollCallEditorPage.vue') },
      { path: '', component: () => import('pages/rollcalls/RollCallsPage.vue') },
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
