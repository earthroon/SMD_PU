<script setup lang="ts">
import {useSiteContent} from '~/composables/useSiteContent';
import CmsSlot from '~/components/cms/CmsSlot.vue';
const c=useSiteContent();
const pages=computed(()=>c.value?.pages);
import PageHero from '~/components/feature/PageHero.vue';
import ArchiveGallery from '~/components/feature/ArchiveGallery.vue';
import CtaBand from '~/components/feature/CtaBand.vue';
const archiveNavigationLabel=computed(()=>{
  const all=[...(c.value?.navigation.leftNav??[]),...(c.value?.navigation.rightNav??[])];
  return all.find(link=>link.to==='/archive')?.label??'수강갤러리';
});
useSeoMeta({title:computed(()=>`${archiveNavigationLabel.value} | SMD 아카데미`)});
</script>
<template><PageHero :eyebrow="pages?.archive.hero.eyebrow??''" :lede="pages?.archive.hero.ledeSegments.join(' ')"><template #title>{{ pages?.archive.hero.titleLines[0] }}<br />{{ pages?.archive.hero.titleLines[1] }}</template></PageHero><ArchiveGallery mode="full" /><CmsSlot :nodes="c?.pageSlots.archive.afterGallery??[]" /><CmsSlot :nodes="c?.pageSlots.archive.beforeCta??[]" /><CtaBand :title="pages?.archive.cta.title??''" :link-label="pages?.archive.cta.label" external /></template>
