<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
const facts=homeCopyRefs.infoBar;
</script>
<template>
  <section data-home-section="info-bar" data-figma-node="node-1:134" class="smd-home-section smd-home--info-bar">
    <div class="smd-home__container smd-home__facts">
      <div v-for="item in facts" :key="item.label" class="smd-home__fact">
        <p class="whitespace-pre-line text-sm font-medium text-foreground-700"><HomeFigmaText :text-key="item.label" /></p>
        <p class="smd-home__fact-value mt-2 whitespace-pre-line font-heading text-lg font-semibold text-foreground-950 md:text-xl"><HomeFigmaText :text-key="item.value" /></p>
      </div>
    </div>
  </section>
</template>
