<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
import HomeMediaFrame from './HomeMediaFrame.vue';
const copy=homeCopyRefs.specialStart;
</script>
<template>
  <section data-home-section="special-start" data-figma-node="node-1:123" class="smd-home-section smd-home--special-start">
    <div class="smd-home__container smd-home__special-layout">
      <div class="smd-home__copy-block">
        <h2 class="font-heading text-3xl font-semibold text-foreground-950 md:text-5xl"><HomeFigmaText :text-key="copy.title" /></h2>
        <ol class="smd-home__special-points">
          <li v-for="point in copy.points" :key="point.numeral" class="smd-home__special-point">
            <span class="font-heading text-2xl font-semibold text-primary-600"><HomeFigmaText :text-key="point.numeral" /></span>
            <p class="max-w-lg whitespace-pre-line text-base leading-relaxed text-foreground-800"><HomeFigmaText :text-key="point.text" /></p>
          </li>
        </ol>
      </div>
      <div class="smd-home__media"><HomeMediaFrame :slot-id="copy.photo" /></div>
    </div>
  </section>
</template>
