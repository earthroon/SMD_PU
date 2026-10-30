<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
const copy=homeCopyRefs.hero;
</script>
<template>
  <section data-home-section="hero" data-figma-node="node-1:4" class="smd-home-section smd-home--hero">
    <div class="smd-home__container">
      <p class="font-label text-xs font-medium tracking-[0.16em] text-foreground-700"><HomeFigmaText :text-key="copy.eyebrow" /></p>
      <h1 class="mt-6 max-w-4xl whitespace-pre-line font-heading text-4xl font-semibold leading-tight text-foreground-950 md:text-6xl"><HomeFigmaText :text-key="copy.heading" /></h1>
      <p class="smd-home__hero-intro mt-7 max-w-2xl whitespace-pre-line text-base leading-relaxed text-foreground-800 md:text-xl"><HomeFigmaText :text-key="copy.introduction" /></p>
    </div>
  </section>
</template>
