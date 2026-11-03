<script setup lang="ts">
import CurriculumSectionHeading from './CurriculumSectionHeading.vue';
import CurriculumSourceText from './CurriculumSourceText.vue';
import { curriculumSourceShapes } from '~/data/curriculum-r1-shapes.generated';
import { curriculumFrameStyle } from '~/utils/curriculumR1LayoutMath';
const weeks=[{week:1,shape:'72',label:'153',title:'154',detail:'provided'},
  {week:2,shape:'73',label:'389',title:'390',detail:'not-provided'},
  {week:3,shape:'74',label:'391',title:'392',detail:'not-provided'},
  {week:4,shape:'75',label:'393',title:'394',detail:'not-provided'},
  {week:5,shape:'76',label:'395',title:'396',detail:'not-provided'},
  {week:6,shape:'388',label:'397',title:'398',detail:'not-provided'}] as const;
const points=[['403','404'],['405','406'],['407','408'],['409','410'],['411','412']] as const;
</script>
<template><CurriculumSectionHeading label="387" title="386" />
  <div class="smd-curriculum__weeks" role="tablist" aria-label="6주 교육과정">
    <button v-for="week in weeks" :id="'curriculum-week-'+week.week" :key="week.week" type="button" role="tab"
      :aria-selected="week.week===1" :aria-controls="week.week===1?'curriculum-week-panel-1':undefined"
      :disabled="week.detail==='not-provided'" :tabindex="week.week===1?0:-1" :data-week="week.week"
      :data-detail-state="week.detail" :title="week.detail==='not-provided'?'상세 안내 준비 중':undefined"
      class="smd-curriculum__week" :class="{'smd-curriculum__week--active':week.week===1}"
      :style="curriculumFrameStyle(curriculumSourceShapes[week.shape].frame,'six-week-program')">
      <CurriculumSourceText :text-id="week.label" as="span" class="smd-curriculum__week-label" :frame="curriculumSourceShapes[week.shape].frame" />
      <CurriculumSourceText :text-id="week.title" as="span" class="smd-curriculum__week-title" :frame="curriculumSourceShapes[week.shape].frame" />
    </button>
  </div>
  <div id="curriculum-week-panel-1" role="tabpanel" aria-labelledby="curriculum-week-1" class="smd-curriculum__week-panel">
    <div class="smd-curriculum__week-copy"><CurriculumSourceText text-id="400" class="smd-curriculum__card-label" />
      <CurriculumSourceText text-id="401" as="h3" class="smd-curriculum__week-heading" />
      <CurriculumSourceText text-id="402" />
      <ul class="smd-curriculum__week-points"><li v-for="[plus,body] in points" :key="body">
        <CurriculumSourceText :text-id="plus" as="span" aria-hidden="true" />
        <CurriculumSourceText :text-id="body" as="span" /></li></ul>
    </div><div class="smd-curriculum__week-media" data-media-state="unassigned" aria-hidden="true"></div>
  </div>
  <CurriculumSourceText text-id="414" class="smd-curriculum__week-note" />
  <p class="smd-curriculum__week-availability" role="note">2–6주차 상세 안내 준비 중</p>
</template>
