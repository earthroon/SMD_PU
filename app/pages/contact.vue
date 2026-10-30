<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import CmsSlot from '~/components/cms/CmsSlot.vue';
import PageHero from '~/components/feature/PageHero.vue';
import Reveal from '~/components/feature/Reveal.vue';
import ContactForm from '~/components/contact/ContactForm.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
const channels=computed(()=>{
  const nav=c.value?.navigation;
  return (pages.value?.contact.channels??[]).map((ch,index)=>({
    icon:['ri-kakao-talk-fill','ri-phone-line','ri-instagram-line','ri-youtube-line'][index],
    label:ch.label,value:ch.displayValue,
    href:ch.target==='kakao'?nav?.kakaoUrl??'':ch.target==='phone'?`tel:${(nav?.contactPhone??'').replace(/[^\d]/g,'')}`:
      ch.target==='instagram'?nav?.instagramUrl??'':nav?.youtubeUrl??''
  }));
});
useSeoMeta({title:'상담 문의 | SMD 아카데미'});
</script>
<template>
  <PageHero :eyebrow="pages?.contact.hero.eyebrow??''" :lede="pages?.contact.hero.ledeSegments.join(' ')"><template #title>{{ pages?.contact.hero.titleLines[0] }}<br />{{ pages?.contact.hero.titleLines[1] }}</template></PageHero>
  <CmsSlot :nodes="c?.pageSlots.contact.afterHero??[]" />
  <section class="py-16 md:py-24"><div class="container-x grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-14">
    <Reveal><span class="eyebrow">{{ pages?.contact.channelsEyebrow }}</span><h2 class="mt-5 font-heading text-2xl font-semibold tracking-tight text-foreground-950 md:text-3xl">{{ pages?.contact.channelsHeading }}</h2><div class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1"><a v-for="channel in channels" :key="channel.label" :href="channel.href" target="_blank" rel="noopener noreferrer" class="group flex items-center gap-4 rounded-lg border border-background-200 bg-background-50 p-4 transition-colors duration-300 hover:border-primary-300"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-background-100 text-foreground-800 transition-colors group-hover:bg-primary-100 group-hover:text-primary-700"><i :class="[channel.icon,'text-xl']" /></span><span class="min-w-0"><span class="block font-label text-[11px] uppercase tracking-[0.2em] text-foreground-500">{{ channel.label }}</span><span class="mt-0.5 block truncate font-heading text-base font-medium text-foreground-950">{{ channel.value }}</span></span><i class="ri-arrow-right-line ml-auto text-foreground-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary-600" /></a></div><div class="mt-8 rounded-lg border border-background-200 bg-background-100 p-6"><div class="font-label text-[11px] uppercase tracking-[0.22em] text-foreground-500">{{ pages?.contact.operatingHoursHeading }}</div><p class="mt-3 text-sm leading-relaxed text-foreground-700">{{ pages?.contact.operatingHoursLines[0] }}<br />{{ pages?.contact.operatingHoursLines[1] }}</p></div></Reveal>
    <Reveal :delay="120"><ContactForm /></Reveal>
  </div></section>
</template>
