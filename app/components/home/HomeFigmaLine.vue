<script setup lang="ts">
import { homeR2LineCandidates, type HomeR2LineNodeKey } from '~/data/home-r2-line-candidates';
const props=defineProps<{ lineKey: HomeR2LineNodeKey }>();
const source=computed(()=>homeR2LineCandidates[props.lineKey]);
const length=computed(()=>source.value.centerlineLocal[2]);
const weight=computed(()=>source.value.stroke.weight);
</script>
<template>
  <svg class="smd-home-line-candidate" role="presentation" aria-hidden="true"
    :data-figma-line="lineKey" data-original-node-kind="LINE" data-original-height="0"
    data-visual-qualification="CANDIDATE_NOT_PIXEL_VERIFIED" :data-line-source-digest="source.lineSourceDigest"
    :viewBox="`0 ${-weight / 2} ${length} ${weight}`" :style="{ height: `${weight}px` }" preserveAspectRatio="none">
    <line :x1="0" :y1="0" :x2="length" :y2="0" :stroke-width="weight" stroke="black" />
  </svg>
</template>
