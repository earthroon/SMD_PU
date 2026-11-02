<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import CmsSlot from '~/components/cms/CmsSlot.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
import PageHero from '~/components/feature/PageHero.vue';
import TeachGrid from '~/components/feature/TeachGrid.vue';
import Reveal from '~/components/feature/Reveal.vue';
import CtaBand from '~/components/feature/CtaBand.vue';
const process=computed(()=>pages.value?.curriculum.learningPath.steps??[]);
useSeoMeta({title:'교육과정 | SMD 아카데미'});
</script>
<template>
  <PageHero :eyebrow="pages?.curriculum.hero.eyebrow??''" :lede="pages?.curriculum.hero.ledeSegments.join(' ')"><template #title>{{ pages?.curriculum.hero.titleLines[0] }}<br />{{ pages?.curriculum.hero.titleLines[1] }}</template></PageHero>
  <section class="py-16 md:py-24"><div class="container-x"><TeachGrid /></div></section>
  <CmsSlot :nodes="c?.pageSlots.curriculum.afterTeach??[]" />
  <section class="border-t border-background-200 bg-background-100 py-16 md:py-24"><div class="container-x"><Reveal><span class="eyebrow">{{ pages?.curriculum.learningPath.eyebrow }}</span><h2 class="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground-950 md:text-4xl">{{ pages?.curriculum.learningPath.heading }}</h2></Reveal><div class="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-background-200 bg-background-200 sm:grid-cols-2 lg:grid-cols-4"><div v-for="item in process" :key="item.step" class="bg-background-50 p-6"><div class="flex items-center gap-3"><span class="grid h-8 w-8 place-items-center rounded-full bg-primary-100 font-label text-xs text-primary-700">{{ item.step }}</span><h3 class="font-heading text-base font-semibold text-foreground-950">{{ item.title }}</h3></div><p class="mt-4 text-sm leading-relaxed text-foreground-600">{{ item.desc }}</p></div></div></div></section>
  <CmsSlot :nodes="c?.pageSlots.curriculum.afterLearningPath??[]" />
  <CmsSlot :nodes="c?.pageSlots.curriculum.beforeCta??[]" />
  <CtaBand :title="pages?.curriculum.cta.title??''" :link-label="pages?.curriculum.cta.label" external />
</template>
