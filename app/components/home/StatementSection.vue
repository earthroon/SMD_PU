<script setup lang="ts">
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
import Reveal from '~/components/feature/Reveal.vue';
</script>
<template>
  <section class="mt-16 border-t border-background-200 py-16 md:mt-24 md:py-24"><div class="container-x grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
    <Reveal><div class="aspect-[4/3] w-full overflow-hidden rounded-lg bg-background-100"><img :src="pages?.home.statement.image.src" :alt="pages?.home.statement.image.alt" :title="pages?.home.statement.image.title" class="h-full w-full object-cover object-top" /></div></Reveal>
    <Reveal :delay="120"><span class="eyebrow">{{ pages?.home.statement.eyebrow }}</span><p class="mt-6 font-heading text-2xl font-medium leading-[1.45] tracking-tight text-foreground-950 md:text-3xl">{{ pages?.home.statement.paragraph }}</p><div class="mt-8 flex items-center gap-3"><span class="h-px w-10 bg-foreground-300"/><span class="font-label text-[11px] uppercase tracking-[0.24em] text-foreground-500">{{ pages?.home.statement.footerLabel }}</span></div></Reveal>
  </div></section>
</template>
