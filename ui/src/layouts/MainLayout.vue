<template>
  <q-layout view="hhh lpR fFf" class="flex justify-center">
    <q-header class="bg-primary text-white" height-hint="98">
      <q-toolbar>
        <q-toolbar-title class="flex flex-center">
          <b>@squadbot</b>
        </q-toolbar-title>
      </q-toolbar>

      <q-tabs align="center">
        <q-route-tab to="/receipts" label="Чеки" />
        <q-route-tab to="/payments" label="Платежі" />
        <q-route-tab to="/rollcalls" label="Переклички" />
      </q-tabs>
    </q-header>

    <q-page-container class="col-grow" style="max-width: 600px;">
      <div class="q-pa-md">
          <router-view />
      </div>
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MainLayout',
})
</script>
