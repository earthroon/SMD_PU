<script setup lang="ts">
import { useSiteContent } from '~/composables/useSiteContent';
import { assertHomeBodyPlan } from '~/data/home-r2-composition';
import { examineHomeLegacySlots } from '~/utils/homeR2Admission';
import HeroSection from '~/components/home/HeroSection.vue';
import FigmaSceneSection from '~/components/figma/FigmaSceneSection.vue';
import HomeIntroStage from '~/components/home/HomeIntroStage.vue';
import {figmaScene} from '~/data/figma-r2-scene.generated';
import HomeInfoBar from '~/components/home/HomeInfoBar.vue';
import StatementSection from '~/components/home/StatementSection.vue';
import TeachSection from '~/components/home/TeachSection.vue';
import HomeBenefits from '~/components/home/HomeBenefits.vue';
import HomeMethods from '~/components/home/HomeMethods.vue';
import HomeLocation from '~/components/home/HomeLocation.vue';
import HomeFaq from '~/components/home/HomeFaq.vue';
import HomeConsultationCta from '~/components/home/HomeConsultationCta.vue';

assertHomeBodyPlan();
const content = useSiteContent();
const legacyAdmission = computed(() => content.value ? examineHomeLegacySlots(content.value.pageSlots.home) : null);
// Historical CMS inserts are not silently dropped or assigned to arbitrary Figma sections.
const rejectLegacySlots = (status: typeof legacyAdmission.value) => {
  if (status?.kind !== 'conflict') return;
  const error = createError({ statusCode: 503, statusMessage: status.code, fatal: true });
  if (import.meta.server) throw error;
  showError(error);
};
rejectLegacySlots(legacyAdmission.value);
if (import.meta.client) watch(legacyAdmission, rejectLegacySlots, { flush: 'sync' });
useSeoMeta({ title: 'SMD 아카데미 | 인테리어필름 시공 실무 교육' });
</script>
<template>
  <!-- Exactly one visible paint owner per breakpoint. Desktop uses JSONL scene; tablet/mobile reflow keeps semantic DOM. -->
  <template v-if="legacyAdmission?.kind === 'empty'">
    <div class="smd-home smd-home--figma-scene" data-home-layout-contract="SMD_FIGMA_SCENE_VR1"
      :data-figma-source-digest="figmaScene.sourceSnapshotDigest" data-original-render-qualification="BLOCKED">
      <HomeIntroStage />
      <FigmaSceneSection v-for="section in figmaScene.sections.filter(s =>
        s.id !== 'header' && s.id !== 'footer' && s.id !== 'hero' && s.id !== 'info-bar')"
        :key="section.id" :section-id="section.id" />
    </div>
    <div class="smd-home smd-home--semantic-reflow" data-home-layout-contract="SMD_HOME_R2_RESPONSIVE_REFLOW_VR1">
      <HeroSection />
      <HomeInfoBar />
      <StatementSection />
      <TeachSection />
      <HomeBenefits />
      <HomeMethods />
      <HomeLocation />
      <HomeFaq />
      <HomeConsultationCta />
    </div>
  </template>
</template>

<style src="~/assets/css/home-r2.css"></style>
<style src="~/assets/css/home-tablet-spacing.css"></style>
<style src="~/assets/css/figma-r2-scene.css"></style>
<style src="~/assets/css/figma-r2-r4.css"></style>

<style src="~/assets/css/home-r2-interaction.css"></style>
