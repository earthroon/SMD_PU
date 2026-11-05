<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FigmaSceneSection from '~/components/figma/FigmaSceneSection.vue';
import HeroSection from '~/components/home/HeroSection.vue';
import HomeInfoBar from '~/components/home/HomeInfoBar.vue';
import { useHomeIntroReveal } from '~/composables/useHomeIntroReveal';
import { figmaScene } from '~/data/figma-r2-scene.generated';
import { homeInfoLayout } from '~/utils/homeInfoLayout';
import { planIntroViewportHeight, titleSafeOverlay, type TitleSafetyRect } from '~/utils/homeIntroViewportGeometry';
import {
  planIntroOverlay, type FilmPaintGeometry, type IntroOverlayPlacement, type IntroVariant,
} from '~/utils/homeIntroOverlayGeometry';

const props = withDefaults(defineProps<{variant?:IntroVariant}>(),{variant:'figma'});
const emit = defineEmits<{completed: []}>();
const root=ref<HTMLElement|null>(null);
const paintFrame=ref<HTMLElement|null>(null);
const overlay=ref<HTMLElement|null>(null);
const filmGeometry=ref<FilmPaintGeometry|null>(null);
const placement=ref<IntroOverlayPlacement|null>(null);
const viewportPaintHeight=ref<number|null>(null);
const paintFrameStyle=computed<Record<string,string>>(()=>({
 height:viewportPaintHeight.value===null?'calc(100svh - var(--smd-header-height))':`${viewportPaintHeight.value}px`,
}));
const titleSafetyOverlap=ref(0);
const viewportFault=ref<string|null>(null);
const placementReady=computed(()=>placement.value?.kind==='admitted');
const introRoute='vue-overlay' as const;
const {phase,admitted,admissionReason,releaseReason,ignoredWheelEvents,animationStarts,
 visualState,firstIntent,presentation}=useHomeIntroReveal(root,introRoute,placementReady);
let mounted=false,resizeObserver:ResizeObserver|null=null;
let geometryEpoch=0, scheduled=false, lastGeneration=-1;
let completionEmitted=false;

function onFilmGeometry(geometry:FilmPaintGeometry):void {
 if(geometry.generation<lastGeneration)return;
 lastGeneration=geometry.generation;
 filmGeometry.value=geometry;
 scheduleGeometry();
}
function updateViewportGeometry():void {
 if(!mounted||!paintFrame.value)return;
 try {
  const header=document.querySelector<HTMLElement>('.smd-site-header');
  if(!header)throw new Error('INTRO_R4_HEADER_AUTHORITY_MISSING');
  const rect=paintFrame.value.getBoundingClientRect();
  const height=planIntroViewportHeight({
   viewportHeightCssPx:window.innerHeight,
   headerHeightCssPx:header.getBoundingClientRect().height,
   frameTopCssPx:rect.top,scrollYCssPx:window.scrollY,
  });
  viewportFault.value=null;
  if(viewportPaintHeight.value===null||Math.abs(viewportPaintHeight.value-height)>0.25){
   viewportPaintHeight.value=height;
   scheduleGeometry();
  }
 }catch(error){
  viewportFault.value=error instanceof Error?error.message:'INTRO_R4_VIEWPORT_GEOMETRY_UNAVAILABLE';
  console.error(viewportFault.value);
 }
}
function protectedTitleRects():TitleSafetyRect[] {
 const frame=paintFrame.value;
 if(!frame)return [];
 const base=frame.querySelector<HTMLElement>('.smd-home-intro__base');
 if(!base)return [];
 const selectors=props.variant==='figma'
  ? '.smd-figma-scene-section--hero [data-figma-kind="TEXT"]'
  : '.smd-home--hero h1, .smd-home--hero .font-label, .smd-home--hero .smd-home__hero-intro';
 return Array.from(base.querySelectorAll<Element>(selectors)).flatMap(node=>{
  const rect=node.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0||getComputedStyle(node).display==='none')return [];
  return [{left:rect.left,top:rect.top,width:rect.width,height:rect.height}];
 });
}
function currentOverlayHeight():number {
 const el=overlay.value;
 if(!el)return 0;
 const content=props.variant==='figma'
   ? el.querySelector<SVGSVGElement>('.smd-figma-scene-section--info-bar > svg')
   : el.querySelector<HTMLElement>('.smd-home--info-bar');
 return content?.getBoundingClientRect().height??0;
}
function measure():void {
 if(!mounted||!paintFrame.value||!overlay.value)return;
 const frame=paintFrame.value.getBoundingClientRect();
 const film=filmGeometry.value;
 if(!film || frame.width<=0||frame.height<=0)return;
 const height=currentOverlayHeight();
 const section=figmaScene.sections.find(item=>item.id==='info-bar');
 if(!section||section.nodeKey!=='node-1:134'){
  const reason='INTRO_R3_SOURCE_IDENTITY_DRIFT';
  placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
    sourceSectionKey:'node-1:134',hostRevision:String(++geometryEpoch),reason};
  console.error(reason);return;
 }
 // Section SVG is width-constrained to the original 1920px artboard.
 if(props.variant==='figma'){
  const expectedHeight=homeInfoLayout.barHeight*Math.min(frame.width,1920)/1920;
  if(Math.abs(height-expectedHeight)>1.5){
   const reason='INTRO_R3_GEOMETRY_UNAVAILABLE';
   placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
     sourceSectionKey:'node-1:134',hostRevision:String(++geometryEpoch),reason};
   console.error(reason,'info-svg-height',height,'expected',expectedHeight);return;
  }
 }
 const current=planIntroOverlay({
  frameRectCss:{left:frame.left,top:frame.top,width:frame.width,height:frame.height},
  film,overlayHeightCssPx:height,overlayWidthCssPx:film.viewportRectCss.width,
  sourceRevision:figmaScene.sourceSnapshotDigest,
  expectedSourceRevision:figmaScene.sourceSnapshotDigest,
  minimumFilmGeneration:lastGeneration,
  hostRevision:`${props.variant}:${film.layoutRevision}:${++geometryEpoch}`,
 });
 // Don't invalidate the active animation for an unchanged measured layout.
 titleSafetyOverlap.value=0;
 if(current.kind==='admitted') {
  const candidate:TitleSafetyRect={
   left:frame.left+current.leftCssPx,top:frame.top+current.topCssPx,
   width:current.widthCssPx,height:current.heightCssPx,
  };
  const protectedRects=protectedTitleRects();
  if(!protectedRects.length){
   placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
    sourceSectionKey:'node-1:134',hostRevision:String(geometryEpoch),reason:'INTRO_R4_TITLE_AUTHORITY_MISSING'};
   console.error('INTRO_R4_TITLE_AUTHORITY_MISSING');return;
  }
  if(!titleSafeOverlay(candidate,protectedRects)){
   titleSafetyOverlap.value=1;
   placement.value={kind:'blocked',contract:'SMD_HOME_INTRO_VUE_PAINT_STACK_R3',
    sourceSectionKey:'node-1:134',hostRevision:String(geometryEpoch),reason:'INTRO_R4_TITLE_SAFE_CONFLICT'};
   console.error('INTRO_R4_TITLE_SAFE_CONFLICT');return;
  }
 }
 const previous=placement.value;
 if(previous?.kind==='admitted'&&current.kind==='admitted'&&
    previous.leftCssPx===current.leftCssPx&&previous.topCssPx===current.topCssPx&&
    previous.widthCssPx===current.widthCssPx&&previous.heightCssPx===current.heightCssPx){return;}
 placement.value=current;
 if(current.kind==='blocked')console.error(current.reason);
}
function scheduleGeometry():void {
 if(scheduled||!mounted)return;
 scheduled=true;
 void nextTick().then(()=>{
  scheduled=false;
  if(mounted)measure();
 });
}
const overlayStyle=computed<Record<string,string>>(():Record<string,string>=>{
 const plan=placement.value;
 const visual=presentation.value;
 switch(plan?.kind){
  case 'admitted':return {
   top:`${plan.topCssPx}px`,left:`${plan.leftCssPx}px`,
   width:`${plan.widthCssPx}px`,height:`${plan.heightCssPx}px`,
   opacity:String(visualState.value==='static'?1:visual.barOpacity),
   transform:`translate3d(0,${visualState.value==='static'?0:visual.barOffsetY}px,0)`,
  };
  default:return {opacity:'0',pointerEvents:'none',width:'100%'};
 }
});
const itemStyle=computed<Record<string,string>>(()=>{
 const p=presentation.value;
 return Object.fromEntries(p.iconOpacity.flatMap((opacity,index)=>[
  [`--smd-intro-icon-${index}-opacity`,String(visualState.value==='static'?1:opacity)],
  [`--smd-intro-icon-${index}-y`,`${visualState.value==='static'?0:p.iconOffsetY[index]}px`],
 ]));
});
watch([phase,releaseReason],([current,reason])=>{
 if(current==='released'&&reason==='completed'&&!completionEmitted){
  completionEmitted=true;emit('completed');
 }
},{flush:'sync'});
onMounted(()=>{
 mounted=true;
 updateViewportGeometry();
 resizeObserver=new ResizeObserver(()=>scheduleGeometry());
 if(paintFrame.value)resizeObserver.observe(paintFrame.value);
 const content=overlay.value?.firstElementChild;
 if(content)resizeObserver.observe(content);
 window.addEventListener('resize',updateViewportGeometry);
 void document.fonts?.ready.then(()=>scheduleGeometry());
 scheduleGeometry();
});
onBeforeUnmount(()=>{
 mounted=false;geometryEpoch++;resizeObserver?.disconnect();resizeObserver=null;
 window.removeEventListener('resize',updateViewportGeometry);
});
</script>
<template>
 <div ref="root" class="smd-home-intro" data-intro-contract="SMD_HOME_INTERACTION_R1"
   data-intro-paint-contract="SMD_HOME_INTRO_VUE_PAINT_STACK_R3"
   :data-intro-variant="props.variant" :data-intro-route="introRoute"
   :data-intro-visual="visualState" :data-intro-phase="phase"
   :data-intro-admitted="admitted?'true':'false'"
   :data-intro-admission-reason="admissionReason"
   data-intro-viewport-contract="SMD_HOME_INTRO_VIEWPORT_FILL_R4"
   :data-intro-paint-height="viewportPaintHeight??'SSR'"
   :data-intro-viewport-fault="viewportFault??undefined"
   :data-intro-title-overlap="titleSafetyOverlap"
   :data-intro-overlay-status="placement?.kind??'pending'"
   :data-intro-overlay-reason="placement?.reason??undefined"
   :data-intro-overlap-area="placement?.kind==='admitted'?placement.paintedIntersectionAreaCssPx2:0"
   :data-intro-release-reason="releaseReason??undefined"
   :data-intro-animation-starts="animationStarts"
   :data-intro-first-intent="firstIntent??undefined"
   :data-intro-ignored-wheel="ignoredWheelEvents" :style="itemStyle">
   <div ref="paintFrame" class="smd-home-intro__paint-stack" data-intro-paint-owner="frame" :style="paintFrameStyle">
    <div class="smd-home-intro__base" data-intro-paint-owner="base">
      <FigmaSceneSection v-if="props.variant==='figma'" section-id="hero" :paint-height-css-px="viewportPaintHeight"
       @film-paint-geometry="onFilmGeometry" />
      <HeroSection v-else :paint-height-css-px="viewportPaintHeight" @film-paint-geometry="onFilmGeometry" />
    </div>
    <div ref="overlay" class="smd-home-intro__overlay" data-intro-paint-owner="overlay"
      :data-intro-overlay-admitted="placementReady?'true':'false'" :style="overlayStyle">
      <FigmaSceneSection v-if="props.variant==='figma'" section-id="info-bar" />
      <HomeInfoBar v-else />
    </div>
   </div>
 </div>
</template>
