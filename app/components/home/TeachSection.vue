<script setup lang="ts">
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
import Reveal from '~/components/feature/Reveal.vue';
import TeachGrid from '~/components/feature/TeachGrid.vue';
</script>
<template>
  <section class="border-t border-background-200 py-16 md:py-24"><div class="container-x"><div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><Reveal><span class="eyebrow">{{ pages?.home.teachIntro.eyebrow }}</span><h2 class="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground-950 md:text-4xl">{{ pages?.home.teachIntro.heading }}</h2></Reveal><Reveal :delay="120"><p class="text-sm leading-relaxed text-foreground-600 md:text-right">{{ pages?.home.teachIntro.summaryLines[0] }}<br class="hidden md:block" /> {{ pages?.home.teachIntro.summaryLines[1] }}</p></Reveal></div><div class="mt-12"><TeachGrid /></div></div></section>
</template>
