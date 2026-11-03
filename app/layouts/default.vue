<script setup lang="ts">
import SiteHeader from '~/components/feature/SiteHeader.vue';
import SiteFooter from '~/components/feature/SiteFooter.vue';
const route = useRoute();
</script>

<template>
  <div class="smd-site-shell flex min-h-screen flex-col bg-background-50" :data-page-skin="route.path === '/about' ? 'about' : route.path === '/curriculum' ? 'curriculum' : undefined">
    <SiteHeader />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
