<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
withDefaults(defineProps<{ title: string; to?: string; linkLabel?: string; external?: boolean }>(), {
  to: '/contact',
  linkLabel: '바로가기',
  external: false,
});
const content = useSiteContent();
</script>

<template>
  <section class="bg-foreground-950">
    <div class="container-x flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between md:py-20">
      <h2 class="max-w-2xl font-heading text-2xl font-semibold leading-snug tracking-tight text-background-50 md:text-3xl">{{ title }}</h2>
      <a
        v-if="external"
        :href="content?.navigation.kakaoUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-6 py-3 font-label text-sm text-background-50 transition-colors duration-300 hover:bg-primary-400"
      >{{ linkLabel }} <i class="ri-arrow-right-line"></i></a>
      <NuxtLink
        v-else
        :to="to"
        class="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-6 py-3 font-label text-sm text-background-50 transition-colors duration-300 hover:bg-primary-400"
      >{{ linkLabel }} <i class="ri-arrow-right-line"></i></NuxtLink>
    </div>
  </section>
</template>
