<script setup lang="ts">
import HomeFigmaText from './HomeFigmaText.vue';
import HomeFigmaLine from './HomeFigmaLine.vue';
import { homeCopyRefs } from '~/data/home-r2-composition';
const copy=homeCopyRefs.training;
</script>
<template>
  <section data-home-section="training-track" data-figma-node="node-1:93" class="smd-home-section smd-home--training-track">
    <div class="smd-home__container">
      <h2 class="text-center font-heading text-3xl font-semibold md:text-5xl"><HomeFigmaText :text-key="copy.title" /></h2>
      <p class="mx-auto mt-5 max-w-3xl text-center text-base leading-relaxed text-foreground-700 md:text-lg"><HomeFigmaText :text-key="copy.description" /></p>
      <div class="smd-home__training-facts">
        <div v-for="fact in copy.facts" :key="fact.label" class="smd-home__training-fact">
          <p class="text-sm text-foreground-600"><HomeFigmaText :text-key="fact.label" /></p>
          <p class="smd-home__training-fact-value mt-2 whitespace-pre-line font-heading text-lg font-semibold"><HomeFigmaText :text-key="fact.value" /></p>
        </div>
      </div>
      <div class="smd-home__training-tracks">
        <div v-for="(part,index) in [copy.morning, copy.afternoon]" :key="part.label" class="smd-home__training-track">
          <h3 class="font-heading text-2xl font-semibold"><HomeFigmaText :text-key="part.label" /></h3>
          <HomeFigmaLine :line-key="index === 0 ? 'node-1:488' : 'node-1:496'" class="smd-home__track-line" />
          <p class="text-lg text-foreground-700"><HomeFigmaText :text-key="part.work" /></p>
        </div>
      </div>
    </div>
  </section>
</template>
