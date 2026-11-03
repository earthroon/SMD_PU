<script setup lang="ts">
import { computed, ref } from 'vue';
import { aboutSourceAssets } from '~/data/about-r1-assets.generated';
import { aboutR1Source } from '~/data/about-r1-manifest';
import { aboutMediaCss } from '~/utils/aboutR1LayoutMath';
import type { AboutPhotoSlotId } from '~/data/about-r1-types';
const props = defineProps<{ slotId: AboutPhotoSlotId }>();
const photo = computed(() => aboutSourceAssets.photos[props.slotId]);
const src = computed(() => '/about/' + encodeURIComponent(photo.value.fileName) + '?v=' + photo.value.sha256);
const geometry = computed(() => aboutMediaCss(photo.value));
const state = ref<'pending' | 'loaded' | 'failed'>('pending');
const style = computed(() => {
  const p = photo.value, section = aboutR1Source.sections.find(s => s.id === p.sectionId)!;
  return { ...geometry.value.frameStyle, '--media-x': p.frame[0],
    '--media-y': p.frame[1] - section.top, '--media-width': geometry.value.frameWidth };
});
function settle(event: Event, next: 'loaded' | 'failed') {
  const img = event.currentTarget as HTMLImageElement | null;
  if (img?.getAttribute('src') === src.value) state.value = next;
}
</script>
<template>
  <figure class="smd-about__media" :style="style" :data-about-photo="slotId"
    :data-source-layer="photo.sourceLayerId" :data-source-sha256="photo.sha256" :data-media-state="state">
    <img :key="photo.sha256" :src="src" :alt="decodeURIComponent(photo.alt)" :title="decodeURIComponent(photo.title)"
      :width="photo.sourceWidth" :height="photo.sourceHeight" :style="geometry.imageStyle"
      :loading="slotId === 'about.hero.photo' ? 'eager' : 'lazy'"
      :fetchpriority="slotId === 'about.hero.photo' ? 'high' : 'auto'" decoding="async"
      @load="settle($event, 'loaded')" @error="settle($event, 'failed')" />
    <figcaption v-if="state === 'failed'" role="status">이미지를 불러오지 못했습니다.</figcaption>
  </figure>
</template>
