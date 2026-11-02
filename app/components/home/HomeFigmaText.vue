<script setup lang="ts">
import { homeFigmaText, type HomeFigmaTextKey } from '~/data/home-r2-copy';
import { homeR2VisualText } from '~/data/home-r2-visual-text';
import { homeVisibleBrandText } from '~/utils/homeBrandVisibleText';
const props = defineProps<{ textKey: HomeFigmaTextKey }>();
const text = computed(() => homeR2VisualText[props.textKey]);
const source = computed(() => homeFigmaText[props.textKey]);
</script>
<template>
  <span class="smd-home-figma-text" :data-figma-text="textKey" :data-text-digest="source.textDigest">
    <span v-for="(run, index) in text.runs" :key="index" :style="run.style">{{ homeVisibleBrandText(textKey, run.characters) }}</span>
  </span>
</template>
