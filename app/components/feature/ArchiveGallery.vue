<script setup lang="ts">
import Reveal from './Reveal.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const active=ref('ALL');
const filtered=computed(()=>active.value==='ALL'?(c.value?.archive.items??[]):(c.value?.archive.items??[]).filter(i=>i.category===active.value));
</script>
<template>
  <section class="bg-foreground-950 py-16 md:py-24"><div class="container-x">
    <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <Reveal><span class="inline-block text-[11px] font-label uppercase tracking-[0.28em] text-primary-400">{{ pages?.archive.sectionEyebrow }}</span><h2 class="mt-4 font-heading text-3xl font-semibold tracking-tight text-background-50 md:text-5xl">{{ pages?.archive.sectionHeading }}</h2></Reveal>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-2"><span v-for="(filter,index) in c?.archive.filters" :key="filter" class="flex items-center gap-2"><span v-if="index > 0" class="text-foreground-700">/</span><button type="button" :aria-pressed="active===filter" :class="['whitespace-nowrap font-label text-sm transition-colors duration-300',active===filter?'text-primary-400':'text-foreground-500 hover:text-background-100']" @click="active=filter">{{ filter }}</button></span></div>
    </div>
    <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Reveal v-for="(item,index) in filtered" :key="item.title" :delay="index*80"><article class="group cursor-pointer"><div class="relative flex aspect-[4/3] w-full items-end overflow-hidden rounded-lg border border-foreground-800 bg-gradient-to-br from-foreground-900 to-foreground-950 p-4 transition-colors duration-300 group-hover:border-primary-500/60"><img v-if="item.image" :src="item.image" :alt="item.title" class="absolute inset-0 h-full w-full object-cover" /><div v-else class="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-foreground-800 text-foreground-600 transition-colors duration-300 group-hover:border-primary-500/60 group-hover:text-primary-400"><i class="ri-image-line text-lg" /></div><span class="relative rounded-full border border-foreground-800 bg-foreground-900/80 px-3 py-1 font-label text-[11px] tracking-wide text-foreground-400">{{ item.category }}</span></div><div class="mt-4 flex items-start justify-between gap-3"><h3 class="font-heading text-base font-medium text-background-50">{{ item.title }}</h3><i class="ri-arrow-right-line mt-0.5 text-foreground-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary-400" /></div><p class="mt-1 text-sm text-foreground-500">{{ item.sub }}</p></article></Reveal>
    </div>
    <p v-if="!filtered.length" class="mt-10 text-sm text-foreground-500">{{ pages?.archive.emptyStateText }}</p>
  </div></section>
</template>
