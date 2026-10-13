<script setup lang="ts">
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const facts=computed(()=>pages.value?.home.facts??[]);
</script>
<template>
  <section class="bg-white pt-28 md:pt-36"><div class="container-x">
    <div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <div class="animate-fade-up"><span class="eyebrow">{{ pages?.home.hero.eyebrow }}</span><h1 class="mt-5 font-heading text-4xl font-semibold leading-[1.12] tracking-tight text-foreground-950 md:text-6xl">{{ pages?.home.hero.titleLines[0] }}<br />{{ pages?.home.hero.titleLines[1] }}</h1><p class="mt-6 max-w-md text-sm leading-relaxed text-foreground-600 md:text-base">{{ pages?.home.hero.ledeSegments[0] }}<br class="hidden sm:block" /> {{ pages?.home.hero.ledeSegments[1] }}</p><div class="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"><NuxtLink to="/curriculum" class="link-arrow">{{ pages?.home.hero.primaryLinkLabel }} <i class="ri-arrow-right-line" /></NuxtLink><a :href="c?.navigation.kakaoUrl" target="_blank" rel="noopener noreferrer" class="link-arrow">{{ pages?.home.hero.secondaryLinkLabel }} <i class="ri-arrow-right-line" /></a></div></div>
      <div class="animate-fade-up" style="animation-delay:140ms"><div class="aspect-[4/3] w-full overflow-hidden rounded-lg bg-background-100"><img :src="pages?.home.hero.image.src" :alt="pages?.home.hero.image.alt" :title="pages?.home.hero.image.title" class="h-full w-full object-cover object-top" /></div></div>
    </div>
    <div class="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-background-200 bg-background-200 sm:grid-cols-3 md:mt-20"><div v-for="fact in facts" :key="fact.k" class="bg-background-50 px-6 py-6"><div class="font-label text-[11px] uppercase tracking-[0.22em] text-foreground-500">{{ fact.k }}</div><div class="mt-2 font-heading text-lg font-semibold text-foreground-950">{{ fact.v }}</div></div></div>
  </div></section>
</template>
