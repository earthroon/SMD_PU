<script setup lang="ts">
import { homeCopyRefs } from '~/data/home-r2-composition';
import HomeFigmaText from './HomeFigmaText.vue';
import HomeFigmaLine from './HomeFigmaLine.vue';
import {useHomeR2Published} from '~/composables/useHomeR2Published';
import {useSiteContent} from '~/composables/useSiteContent';
const copy=homeCopyRefs.faq;
const published=useHomeR2Published();
const content=useSiteContent();
const route=useRoute();
const faqRows=computed(()=>{
  if(route.path!=='/'||!content.value||!published.value||
     content.value.publication.id!==published.value.publicationId||
     content.value.publication.digest!==published.value.publicationDigest)return [];
  return published.value.faq;
});
const rowAt=(index:number)=>faqRows.value.find(x=>x.id===`home.faq.0${index+1}`);

const lines=['node-1:25','node-1:26','node-1:27','node-1:28','node-1:29'] as const;
const iconLines=[['node-1:35','node-1:36'],['node-1:38','node-1:39'],
  ['node-1:41','node-1:42'],['node-1:44','node-1:45']] as const;
</script>
<template>
  <section data-home-section="faq" data-figma-node="node-1:22" class="smd-home-section smd-home--faq">
    <div class="smd-home__container">
      <h2 class="smd-home__section-heading"><HomeFigmaText :text-key="copy.title" /></h2>
      <div class="smd-home__faq-layout" :data-faq-state="faqRows.length?'published':'pending-cms-copy'">
        <HomeFigmaLine :line-key="lines[0]" />
        <!-- Four *empty* FAQ rows; Figma placeholder characters never enter public DOM. -->
        <template v-for="(item,index) in copy.pendingSources" :key="item">
          <details v-if="rowAt(index)" class="smd-home__faq-row smd-home__faq-disclosure"
            :data-faq-id="rowAt(index)?.id">
            <summary class="smd-home__faq-summary">
              <span>{{ rowAt(index)?.question }}</span>
              <svg class="smd-home__faq-icon" viewBox="0 0 44 44" aria-hidden="true" role="presentation"
                data-visual-qualification="CANDIDATE_NOT_PIXEL_VERIFIED"
                :data-figma-line-vertical="iconLines[index]?.[0]" :data-figma-line-horizontal="iconLines[index]?.[1]">
                <path d="M22 0V44M0 22H44" stroke="black" stroke-width="3" fill="none" />
              </svg>
            </summary>
            <p class="smd-home__faq-answer">{{ rowAt(index)?.answer }}</p>
          </details>
          <div v-else class="smd-home__faq-row" :data-pending-faq-source="item">
            <span class="smd-home__faq-unfilled" aria-hidden="true" />
            <svg class="smd-home__faq-icon" viewBox="0 0 44 44" aria-hidden="true" role="presentation"
              data-visual-qualification="CANDIDATE_NOT_PIXEL_VERIFIED"
              :data-figma-line-vertical="iconLines[index]?.[0]" :data-figma-line-horizontal="iconLines[index]?.[1]">
              <path d="M22 0V44M0 22H44" stroke="black" stroke-width="3" fill="none" />
            </svg>
          </div>
          <HomeFigmaLine :line-key="lines[index+1]!" />
        </template>
      </div>
    </div>
  </section>
</template>
