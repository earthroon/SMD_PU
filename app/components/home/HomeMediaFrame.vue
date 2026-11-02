<script setup lang="ts">
import { homeMediaSlots, type HomeMediaSlotId } from '~/data/home-r2-manifest';
import {useHomeR2Published} from '~/composables/useHomeR2Published';
import {useSiteContent} from '~/composables/useSiteContent';
import {resolveHomeR2PublicImage} from '~/utils/home-r2-v6-public';
const props = defineProps<{slotId: HomeMediaSlotId}>();
const source = computed(() => homeMediaSlots[props.slotId]);
const published=useHomeR2Published();
const content=useSiteContent();
const route=useRoute();
const image=computed(()=>{
  if(route.path!=='/'||!published.value)return null;
  const identity=content.value?.publication;
  if(!identity)return null;
  return resolveHomeR2PublicImage(published.value,{id:identity.id,digest:identity.digest},props.slotId);
});
const frameStyle = computed(() => ({
  aspectRatio: `${source.value.sourceFrameRect[2]} / ${source.value.sourceFrameRect[3]}`,
  borderRadius: source.value.sourceRadii.map(r => `min(${r}px, 9vw)`).join(' '),
  backgroundColor: `rgba(${source.value.placeholderRgba.slice(0,3).map(n => Math.round(n*255)).join(',')},${source.value.placeholderRgba[3]})`,
}));
</script>
<template>
  <div class="smd-home__media-frame w-full shrink-0 overflow-hidden" :data-media-slot="source.slotId"
    :data-media-state="image?'published':'unbound'" :style="frameStyle" :aria-hidden="image?undefined:'true'">
    <img v-if="image" :key="`${published?.publicationId}:${published?.publicationDigest}:${image.assetId}`"
      :src="image.src" :alt="image.alt" :title="image.title" :width="image.width" :height="image.height"
      loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:contain;" />
  </div>
</template>
