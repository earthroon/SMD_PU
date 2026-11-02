<script setup lang="ts">
import { ref, watch } from 'vue';
import FigmaSceneSection from '~/components/figma/FigmaSceneSection.vue';
import { useHomeIntroReveal } from '~/composables/useHomeIntroReveal';

const root = ref<HTMLElement | null>(null);
const { phase, admitted, admissionReason, releaseReason, ignoredWheelEvents, animationStarts } = useHomeIntroReveal(root);
const emit = defineEmits<{ completed: [] }>();
let completionEmitted = false;
// Read-only handoff. The first Intro's wheel ownership and animation math are untouched.
watch([phase, releaseReason], ([current, reason]) => {
  if (current === 'released' && reason === 'completed' && !completionEmitted) {
    completionEmitted = true;
    emit('completed');
  }
}, { flush: 'sync' });
</script>

<template>
  <div ref="root" class="smd-home-intro" data-intro-contract="SMD_HOME_INTERACTION_R1"
    :data-intro-phase="phase" :data-intro-admitted="admitted ? 'true' : 'false'"
    :data-intro-admission-reason="admissionReason" :data-intro-release-reason="releaseReason || undefined"
    :data-intro-animation-starts="animationStarts" :data-intro-ignored-wheel="ignoredWheelEvents">
    <FigmaSceneSection section-id="hero" />
    <FigmaSceneSection section-id="info-bar" />
  </div>
</template>
