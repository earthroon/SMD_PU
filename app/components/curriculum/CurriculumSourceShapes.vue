<script setup lang="ts">
import { computed } from 'vue';
import { curriculumSourceShapes } from '~/data/curriculum-r1-shapes.generated';
import { curriculumSection,roundedSourcePath } from '~/utils/curriculumR1LayoutMath';
import type { CurriculumSectionId } from '~/data/curriculum-r1-types';
const props=defineProps<{sectionId:CurriculumSectionId}>();
const section=computed(()=>curriculumSection(props.sectionId));
const shapes=computed(()=>Object.values(curriculumSourceShapes).filter(s=>s.sectionId===props.sectionId));
</script>
<template><svg class="smd-curriculum__source-shapes" :viewBox="'0 '+section.top+' 1920 '+section.height"
  preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <template v-for="shape in shapes" :key="shape.sourceLayerId">
    <line v-if="shape.kind==='line'" :data-source-shape="shape.sourceLayerId"
      :x1="shape.start[0]" :y1="shape.start[1]" :x2="shape.end[0]" :y2="shape.end[1]"
      :stroke="shape.strokeEnabled?shape.stroke:shape.fillEnabled?shape.fill:'none'"
      :stroke-width="shape.strokeEnabled?shape.strokeWidth:shape.lineWeight" :opacity="shape.opacity" />
    <path v-else :data-source-shape="shape.sourceLayerId" :d="roundedSourcePath(shape.frame,shape.radii)"
      :fill="shape.fillEnabled?shape.fill:'none'" :stroke="shape.strokeEnabled?shape.stroke:'none'"
      :stroke-width="shape.strokeWidth" :opacity="shape.opacity" />
  </template>
</svg></template>
