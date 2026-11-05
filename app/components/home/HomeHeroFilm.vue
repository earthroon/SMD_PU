<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, type PropType } from 'vue';
import { homeFilmAssets, homeFilmEditorialAdmissions, homeFilmEditorialReady } from '~/data/home-film';
import { filmHorizontal } from '~/utils/homeFilmInput';
import {
  filmImageAtPoint, initialFilmSelection, reduceFilmSelection,
  type FilmImageId, type FilmIntent, type FilmSelectionOrigin, type FilmHitSlot,
} from '~/utils/homeFilmSelection';
import {
  admitFilmRateLut, captureFilmViewportAnchor, endNativeFilmGesture,
  filmMotionMode, idleFilmPointer, moveNativeFilmGesture, nativeFilmGestureScrolled,
  observeFilmPointer, positionFilmAnchor, rateForFilmPointer,
  startFilmPointerObservation, startNativeFilmGesture, verifyFilmRateLutDigest,
  type BakedMotionRateLut, type FilmHorizontalTransport, type FilmPointerObservation,
  type FilmRateDecision, type FilmSlotRect, type FilmViewportAnchor, type NativeTouchGesture,
} from '~/utils/homeFilmMotion';
import type { FilmPaintGeometry } from '~/utils/homeIntroOverlayGeometry';
import { FILM_FRAME_HEIGHT_CSS_PX, planFullViewportFilmLayout,
  type FilmLayoutPlan, type FilmLayoutImage } from '~/utils/homeFilmLayout';
import legacyFocusManifest from '~/data/home-film-focus.json';
import {
  allocateFilmFocusHostToken, claimFilmFocusHost, releaseFilmFocusHost, ownsFilmFocusHost,
  decideFilmFocus, filmFocusResponseCurrent, homeFilmApprovedFocusPublications,
  type FilmFocusDecision, type FilmFocusRequest, type FilmFocusRequestIdentity,
  type FilmFocusResponse,
} from '~/utils/homeFilmFocusAdmission';
import curve from '~/data/home-film-speed.json';
import rateLut from '~/data/home-film-rate-lut.json';
import windLutSource from '~/data/home-film-wind-lut.json';
import { admitFilmWindLut, planWindLoop, planWindBridge, sampleWindKeyframes,
 verifyFilmWindLutDigest, type FilmWindLutV1, type WindKeyframePoint } from '~/utils/homeFilmWind';

// Candidate must be explicitly requested by a caller; the product default remains SPEED-R3.
const emit = defineEmits<{ 'film-paint-geometry': [geometry: FilmPaintGeometry] }>();
const props = defineProps({
 paintHeightCssPx: {type:Number as PropType<number|null>,default:null},
 motionProfile: {type: String as PropType<'speed-r3-compat' | 'pointer-rate-candidate'>,default:'speed-r3-compat'},
});
const viewportPaintHeight=computed(()=>props.paintHeightCssPx!==null && Number.isFinite(props.paintHeightCssPx) && props.paintHeightCssPx>0 ? props.paintHeightCssPx : null);
const rootPaintStyle=computed(()=>viewportPaintHeight.value===null?{}:{height:`${viewportPaintHeight.value}px`});
const root=ref<HTMLElement|null>(null),track=ref<HTMLElement|null>(null),rail=ref<HTMLElement|null>(null);
const focusCanvas=ref<HTMLCanvasElement|null>(null),focusCanvasEpoch=ref(0);
const layoutPlan=ref<FilmLayoutPlan|null>(null),focusOverlayStyle=ref<Record<string,string>>({});
const focusOverlayVisible=ref(false),focusFault=ref<string|null>(null);
const focusDecision=ref<FilmFocusDecision>({kind:'static',reason:'FILM_FOCUS_NO_INTENT',imageId:null});
const domFocusKind=computed(()=>focusDecision.value.kind);
const domFocusReason=computed(()=>focusDecision.value.kind==='worker-webgpu'?'WORKER_ADMITTED':focusDecision.value.reason);
const layoutSlot=(index:number)=>layoutPlan.value?.slots[index%homeFilmAssets.length]??null;
const slotStyle=(index:number)=>{
  const slot=layoutSlot(index);
  return slot?{width:`${slot.widthCssPx}px`,height:`${slot.heightCssPx}px`}:undefined;
};
const hovered=ref(false),copies=ref(8),hoveredSlotIndex=ref<number|null>(null);
const transport=ref<FilmHorizontalTransport>({kind:'static',generation:0,reason:'hidden'});
const displayAssets=computed(()=>Array.from({length:copies.value},()=>homeFilmAssets).flat());
const selection=useState('smd-home-film-selection-r13',initialFilmSelection);
const activeImageId=computed<FilmImageId|null>(()=>{
 switch(selection.value.kind){
  case 'preview':case 'committed':case 'releasing':return selection.value.imageId;
  case 'idle':return null;
 }
});
const editorial=homeFilmAssets.map((asset,index)=>({asset,index,source:homeFilmEditorialAdmissions[index]!}));
const editorialStatus=homeFilmEditorialReady?'APPROVED':'FILM_TITLE_METADATA_UNAVAILABLE';
const isCurrent=(id:FilmImageId)=>activeImageId.value===id;
function dispatch(intent:FilmIntent){
 const result=reduceFilmSelection(selection.value,intent);
 selection.value=result.state;
 return result.effect;
}

let animation:Animation|null=null;
let observer:ResizeObserver|undefined,reduced:MediaQueryList|undefined,mobileQuery:MediaQueryList|undefined,fineQuery:MediaQueryList|undefined;
let lastPointerKind:'mouse'|'touch'|null=null;
const windReady=ref(false);
let cycle=0,phase=0,speed=0,target=curve.base,disposed=false,layoutRevision=0;
let plan:{start:number;duration:number;from:number;to:number;loop:boolean;points:WindKeyframePoint[]}|null=null;
let dwell:ReturnType<typeof setTimeout>|undefined, pointerIdle:ReturnType<typeof setTimeout>|undefined;
let pointed:{x:number;y:number}|null=null,pointerCandidate:FilmImageId|null=null;
let pointer:FilmPointerObservation|null=null,rateBin:FilmRateDecision|null=null;
let rateAppliedKey:string|null=null,rateRequestedKey:string|null=null,rateEpoch=0;
let candidateAdmitted=false;
let gesture:NativeTouchGesture={kind:'idle'},focusGeneration=0,focusAnimations:Animation[]=[];
let suppressedTouchClick:{x:number;y:number;until:number}|null=null;
let resizeEpoch=0,lastGeometryKey:string|null=null;
let focusHostToken=0,focusHostGeneration=0,focusDeviceGeneration=0,workerFocusGeneration=0;
let focusWorker:Worker|null=null,focusReady=false,focusIdentity:FilmFocusRequestIdentity|null=null;
let focusDisabledForGeneration:string|null=null,focusRequestCount=0,focusStaleCount=0;
let focusInitEpoch=0;
const sourceImages:readonly FilmLayoutImage[]=homeFilmAssets.map(asset=>({
 imageId:asset.id,intrinsicWidthPx:asset.width,intrinsicHeightPx:asset.height,
 approvedRenditionWidthPx:asset.width,approvedRenditionHeightPx:asset.height,
 renditionId:'source-jpeg',
}));
const sourceLayoutRevision=homeFilmAssets.map(asset=>`${asset.id}:${asset.src}:${asset.width}x${asset.height}`).join('|');
const hoverDwellMs=240; // CF1 approved candidate; no new UX threshold introduced.
const bakedRateLut=rateLut as unknown as BakedMotionRateLut;
const bakedWindLut=windLutSource as FilmWindLutV1;
const mod=(x:number)=>cycle>0?((x%cycle)+cycle)%cycle:0;
const mode=()=>transport.value.kind;
const motionGeneration=()=>transport.value.generation;
const isVisible=()=>!!root.value&&root.value.clientWidth>0&&root.value.getClientRects().length>0;
const desktopAllowed=()=>!disposed&&mode()==='desktop-lut'&&!document.hidden&&
 !reduced?.matches&&cycle>0&&isVisible();
const mobileAllowed=()=>!disposed&&mode()==='native-swipe'&&!document.hidden&&isVisible();
function setFault(code:string){
 if(root.value)root.value.dataset.filmMotionFault=code;
 console.error(code);
}
function invalidateRate(){
 rateEpoch++;rateRequestedKey=null;rateAppliedKey=null;rateBin=null;
 clearTimeout(pointerIdle);pointerIdle=undefined;pointer=null;
}
/** Sample the SAME finite keyframes given to WAAPI. Browser effect-time already includes playbackRate. */
function sample(){
 if(!animation||!plan)return;
 const elapsed=Number(animation.currentTime??0),p=plan;
 if(!Number.isFinite(elapsed)||p.duration<=0)throw new Error('FILM_WIND_SAMPLE_INVALID');
 const rate=animation.playbackRate;
 if(!Number.isFinite(rate)||rate<=0)throw new Error('FILM_WIND_SAMPLE_INVALID');
 const timeMs=p.loop?((elapsed%p.duration)+p.duration)%p.duration:
   Math.max(0,Math.min(elapsed,p.duration));
 const sampled=sampleWindKeyframes(p.points,timeMs/p.duration,p.duration,rate);
 phase=mod(p.start+sampled.distance);
 speed=sampled.velocityCssPxS;
}
function freeze(){
 sample();animation?.pause();
 if(rail.value)rail.value.style.transform=`translateX(${-phase}px)`;
 animation?.cancel();plan=null;invalidateRate();
}
/** Exactly one moving rail owner; loop is a phase-shifted, nonlinear 516+ keyframe trace. */
function install(to:number,duration:number,loop=false){
 if(!desktopAllowed()||!rail.value||!windReady.value)return;
 sample();const start=phase,from=speed;
 if(to===0&&from===0){freeze();speed=0;return;}
 const points=loop?planWindLoop(bakedWindLut,start,cycle):
  planWindBridge(bakedWindLut,start,cycle,from,to===0?0:to/bakedWindLut.meanSpeedCssPxS,
    duration,curve.samples.map(s=>s.t)).points;
 const timeMs=loop?cycle/bakedWindLut.meanSpeedCssPxS*1000:duration;
 const timing={duration:timeMs,iterations:loop?Infinity:1,easing:'linear',fill:'forwards' as FillMode};
 const frames=points.map(p=>({offset:p.offset,transform:`translateX(${-start-p.distance}px)`}));
 const session=motionGeneration(),slotEpoch=++rateEpoch;
 rateRequestedKey=null;rateAppliedKey=null;rateBin=null;
 if(!animation)animation=rail.value.animate(frames,timing);
 else {
  animation.pause();
  if(animation.playbackRate!==1)animation.playbackRate=1;
  (animation.effect as KeyframeEffect).setKeyframes(frames);
  animation.effect!.updateTiming(timing);animation.currentTime=0;animation.play();
 }
 plan={start,duration:timeMs,from,to,loop,points};
 if(root.value){
  root.value.dataset.filmWindProfile='r13-film-wind-v1';
  root.value.dataset.filmWindKeyframes=String(points.length);
  root.value.dataset.filmWindPhase=String(start);
 }
 animation.onfinish=()=>{
  if(!desktopAllowed()||session!==motionGeneration()||slotEpoch!==rateEpoch||!plan)return;
  sample();
  if(target===0){freeze();speed=0;refreshPointerCandidate();return;}
  install(target,0,true);
 };
}
function request(to:number,ms:number){
 if(!desktopAllowed()||!windReady.value)return;
 if(target===to&&animation?.playState==='running')return;
 target=to;install(to,ms);
}
function clearDwell(){clearTimeout(dwell);dwell=undefined;}
function allSlotRects():FilmSlotRect[]{
 return Array.from(rail.value?.querySelectorAll<HTMLElement>('[data-film-image-id]')??[]).map(element=>{
  const rect=element.getBoundingClientRect();
  return {imageId:element.dataset.filmImageId as FilmImageId,
   left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};
 });
}
function hitImage(x:number,y:number):FilmImageId|null{
 const slots=allSlotRects();
 if(hovered.value&&mode()==='desktop-lut'){
  const at=slots.findIndex(r=>x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom);
  hoveredSlotIndex.value=at>=0?at:null;
 }
 return filmImageAtPoint(slots as FilmHitSlot[],x,y);
}
function cancelCandidate(reason:'pointercancel'|'stale'|'surface-change'='surface-change'){
 clearDwell();pointerCandidate=null;
 dispatch({kind:'cancel-preview',reason});
}
function refreshPointerCandidate(){
 if(!desktopAllowed()||!hovered.value||!pointed)return;
 const id=hitImage(pointed.x,pointed.y);
 if(pointerCandidate===id)return;
 clearDwell();pointerCandidate=id;
 if(selection.value.kind==='committed'||selection.value.kind==='releasing')return;
 switch(id){
  case null:dispatch({kind:'cancel-preview',reason:'surface-change'});return;
  default:{
   const pointerGeneration=selection.value.pointerGeneration+1;
   dispatch({kind:'hover-candidate',imageId:id,pointerGeneration});
   const session=motionGeneration(),layout=layoutRevision;
   dwell=setTimeout(()=>{
    if(disposed||!desktopAllowed()||session!==motionGeneration()||layout!==layoutRevision||!hovered.value||!pointed)return;
    if(hitImage(pointed.x,pointed.y)!==id)return refreshPointerCandidate();
    dispatch({kind:'hover-admit',imageId:id,pointerGeneration});
   },hoverDwellMs);
  }
 }
}
function rateKey(rate:FilmRateDecision){return `${motionGeneration()}:${rateEpoch}:${rate.profileId}:${rate.bin}:${rate.rate}`;}
function updateCandidateRate(decision:FilmRateDecision){
 if(!candidateAdmitted||props.motionProfile!=='pointer-rate-candidate'||!desktopAllowed()||!animation||!plan?.loop)return;
 if(!Number.isFinite(decision.rate)||decision.rate<=0){setFault('FILM_MOTION_RATE_NONFINITE');return;}
 const key=rateKey(decision);
 if(key===rateRequestedKey||key===rateAppliedKey)return;
 if(!rateRequestedKey && animation.playbackRate===decision.rate){
  rateAppliedKey=key;return;
 }
 const ownedAnimation=animation,session=motionGeneration(),epoch=rateEpoch;
 rateRequestedKey=key;
 try {
  ownedAnimation.updatePlaybackRate(decision.rate);
  void ownedAnimation.ready.then(()=>{
   if(disposed||animation!==ownedAnimation||session!==motionGeneration()||epoch!==rateEpoch||
       rateRequestedKey!==key)return;
   if(Math.abs(ownedAnimation.playbackRate-decision.rate)>0.00001){
    setFault('FILM_MOTION_RATE_APPLY_MISMATCH');return;
   }
   rateAppliedKey=key;
  }).catch(()=>{
   if(session===motionGeneration()&&epoch===rateEpoch)setFault('FILM_MOTION_RATE_READY_FAILED');
  });
 }catch{setFault('FILM_MOTION_RATE_APPLY_FAILED');}
}
function updatePointerRate(e:PointerEvent){
 if(!desktopAllowed()||e.pointerType!=='mouse')return;
 if(!pointer){
  pointer=startFilmPointerObservation(e,motionGeneration(),layoutRevision);
 }else{
  const observed=observeFilmPointer(pointer,e,bakedRateLut.policy,motionGeneration(),layoutRevision);
  if(observed.kind==='accepted'||observed.kind==='reset')pointer=observed.sample;
 }
 clearTimeout(pointerIdle);
 const session=motionGeneration(),layout=layoutRevision;
 pointerIdle=setTimeout(()=>{
  if(disposed||!pointer||session!==motionGeneration()||layout!==layoutRevision||!desktopAllowed())return;
  pointer=idleFilmPointer(pointer,Math.max(pointer.atMs+bakedRateLut.policy.idleResetMs,performance.now()),bakedRateLut.policy);
  if(candidateAdmitted){rateBin=rateForFilmPointer(bakedRateLut,pointer,rateBin);updateCandidateRate(rateBin);}
 },bakedRateLut.policy.idleResetMs);
 if(candidateAdmitted&&pointer){
  rateBin=rateForFilmPointer(bakedRateLut,pointer,rateBin);
  updateCandidateRate(rateBin);
 }
}
function markPointerKind(kind:'mouse'|'touch'){
 if(lastPointerKind===kind)return;
 lastPointerKind=kind;
 const next=filmMotionMode(window.innerWidth,isVisible()&&!document.hidden,!!reduced?.matches,
   {fineHover:!!fineQuery?.matches,actualPointerType:kind});
 // No avoidable generation reset merely because the already admitted mouse moved.
 if(next!==mode())void resize();
}
function move(e:PointerEvent){
 if(e.pointerType==='touch'){
  if(mobileAllowed())gesture=moveNativeFilmGesture(gesture,e.pointerId,motionGeneration(),e.clientX,e.clientY);
  return;
 }
 if(e.pointerType!=='mouse')return;
 markPointerKind('mouse');
 if(!desktopAllowed())return;
 const id=hitImage(e.clientX,e.clientY);
 if(id===null){if(hovered.value)leave();return;}
 pointed={x:e.clientX,y:e.clientY};
 if(!hovered.value){
  hovered.value=true;
  pointer=startFilmPointerObservation(e,motionGeneration(),layoutRevision);
  sample();request(0,curve.enterMs);
 }
 updatePointerRate(e);refreshPointerCandidate();
}
function enter(e:PointerEvent){move(e);}
function leave(e?:PointerEvent){
 if(e&&e.pointerType!=='mouse')return;
 hovered.value=false;hoveredSlotIndex.value=null;pointed=null;pointerCandidate=null;
 clearDwell();clearTimeout(pointerIdle);pointerIdle=undefined;pointer=null;
 dispatch({kind:'hover-leave',pointerGeneration:selection.value.pointerGeneration});
 if(selection.value.kind!=='committed'&&selection.value.kind!=='releasing')request(curve.base,curve.leaveMs);
}
function commit(imageId:FilmImageId,origin:FilmSelectionOrigin){
 if(!isVisible())return;
 if(origin!=='touch'&&selection.value.kind==='committed'&&selection.value.imageId===imageId){
  release('explicit');return;
 }
 clearDwell();pointerCandidate=null;
 const effect=dispatch({kind:'commit',imageId,origin});
 if(effect.kind==='committed'&&desktopAllowed())request(0,curve.enterMs);
}
function suppressTouchClick(x:number,y:number){
 suppressedTouchClick={x,y,until:performance.now()+750};
}
function click(e:MouseEvent){
 if(!isVisible()||e.button!==0)return;
 const targetElement=e.target as Element|null;
 if(targetElement?.closest('button,a'))return;
 const pointerType=(e as PointerEvent).pointerType;
 if(pointerType==='touch')return;
 const t=suppressedTouchClick;
 if(t){
  const sameGesture=performance.now()<=t.until&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<=12;
  suppressedTouchClick=null;
  if(sameGesture)return;
 }
 markPointerKind('mouse');
 if(mode()!=='desktop-lut')return;
 const imageId=hitImage(e.clientX,e.clientY);
 switch(imageId){
  case null:return;
  default:{
   if(selection.value.kind==='committed'&&selection.value.imageId===imageId){release('explicit');return;}
   commit(imageId,'pointer');return;
  }
 }
}
function release(origin:'keyboard'|'explicit'='keyboard'){
 const prior=activeImageId.value;
 const result=dispatch({kind:'release',origin});
 if(selection.value.kind==='releasing'){
  dispatch({kind:'release-complete',generation:selection.value.generation});
  if(result.kind==='released'){
   pointerCandidate=null;
   if(desktopAllowed()){
    request(hovered.value?0:curve.base,hovered.value?curve.enterMs:curve.leaveMs);
    refreshPointerCandidate();
   }
   if(mobileAllowed()&&prior)void presentMobileRelease(prior);
  }
 }
}
function outsidePointerDown(e:PointerEvent){
 if(e.pointerType!=='mouse'||!isVisible()||selection.value.kind!=='committed')return;
 if(root.value?.contains(e.target as Node))return;
 release('explicit');
}
function key(e:KeyboardEvent){
 switch(e.key){
  case 'Escape':{
   if(selection.value.kind==='committed'||selection.value.kind==='preview'){
    e.preventDefault();release();
   }
   return;
  }
  case 'ArrowLeft':case 'ArrowRight':{
   const buttons=Array.from(root.value?.querySelectorAll<HTMLButtonElement>('.smd-hero-film__commit')??[]);
   const current=buttons.findIndex(button=>button===document.activeElement);
   if(current<0||!buttons.length)return;
   e.preventDefault();
   const next=(current+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
   buttons[next]?.focus();return;
  }
  default:return;
 }
}
function keyboardFocus(imageId:FilmImageId){
 if(!isVisible())return;
 clearDwell();pointerCandidate=null;
 dispatch({kind:'keyboard-focus',imageId});
}
function cancelFocus(){focusGeneration++;for(const a of focusAnimations){a.cancel();}focusAnimations=[];}
function animateFocusElement(element:Element,frames:Keyframe[],duration:number,easing:string){
 const a=element.animate(frames,{duration,easing,fill:'both'});
 focusAnimations.push(a);
 const owned=focusGeneration;
 a.onfinish=()=>{
  if(owned!==focusGeneration)return;
  a.cancel();focusAnimations=focusAnimations.filter(x=>x!==a);
 };
}
async function presentMobileFocus(imageId:FilmImageId){
 cancelFocus();
 const owned=focusGeneration,session=motionGeneration();
 await nextTick();
 if(!mobileAllowed()||reduced?.matches||owned!==focusGeneration||session!==motionGeneration()||
     selection.value.kind!=='committed'||selection.value.imageId!==imageId)return;
 const figures=Array.from(rail.value?.querySelectorAll<HTMLElement>('[data-film-image-id]')??[]);
 const figure=figures.find(el=>el.dataset.filmImageId===imageId);
 if(!figure)return;
 const img=figure.querySelector('img'),opacity=figure.querySelector('.smd-hero-film__focus-layer');
 if(img)animateFocusElement(img,[{transform:'scale(1)'},{transform:'scale(1.025)'}],260,'cubic-bezier(.18,.78,.24,1)');
 if(opacity)animateFocusElement(opacity,[{opacity:0},{opacity:1}],190,'cubic-bezier(.42,0,.22,1)');
 const approved=homeFilmEditorialAdmissions.find(item=>item.imageId===imageId);
 if(approved?.kind==='approved'){
  const caption=Array.from(root.value?.querySelectorAll<HTMLElement>('[data-film-semantic-id]')??[])
   .find(el=>el.dataset.filmSemanticId===imageId)?.querySelector('.smd-hero-film__caption');
  if(caption)animateFocusElement(caption,[{opacity:0},{opacity:1}],220,'cubic-bezier(.25,.65,.32,1)');
 }
}
async function presentMobileRelease(imageId:FilmImageId){
 cancelFocus();
 const owned=focusGeneration,session=motionGeneration();
 await nextTick();
 if(!mobileAllowed()||reduced?.matches||owned!==focusGeneration||session!==motionGeneration())return;
 const figure=Array.from(rail.value?.querySelectorAll<HTMLElement>('[data-film-image-id]')??[])
  .find(el=>el.dataset.filmImageId===imageId);
 const img=figure?.querySelector('img');
 if(img)animateFocusElement(img,[{transform:'scale(1.025)'},{transform:'scale(1)'}],180,'cubic-bezier(.4,0,.7,.3)');
}
/** Renderer state is downstream of Selection. No GPU operation can mutate Commit. */
function focusPolicy(){
 const connection=typeof navigator==='undefined'?null:(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;
 return {
  visible:isVisible()&&!document.hidden,
  workerAvailable:typeof Worker!=='undefined'&&!!focusCanvas.value&&
    typeof focusCanvas.value.transferControlToOffscreen==='function',
  webGpuAvailable:typeof navigator!=='undefined'&&!!(navigator as Navigator & {gpu?:unknown}).gpu,
  eco:false, dataSaver:!!connection?.saveData, reducedMotion:!!reduced?.matches,
 };
}
function retireFocusWorker(){
 const hadWorker=focusWorker!==null;
 if(hadWorker){++focusInitEpoch;focusCanvasEpoch.value++;}
 focusOverlayVisible.value=false;focusIdentity=null;
 const worker=focusWorker;focusWorker=null;focusReady=false;focusDeviceGeneration=0;
 if(worker){
  try {worker.postMessage({kind:'dispose',hostGeneration:focusHostGeneration} satisfies FilmFocusRequest);}catch{}
  worker.terminate();
 }
 if(focusHostToken)releaseFilmFocusHost(focusHostToken);
}
function focusFailed(reason:string){
 focusFault.value=reason;
 focusDisabledForGeneration=`${selection.value.generation}:${layoutPlan.value?.layoutRevision??'none'}`;
 const imageId=activeImageId.value;
 focusDecision.value={kind:'css',imageId,reason};
 if(root.value)root.value.dataset.filmFocusFault=reason;
 retireFocusWorker();
}
function focusedSlot(imageId:FilmImageId):HTMLElement|null{
 const nodes=Array.from(rail.value?.querySelectorAll<HTMLElement>('[data-film-image-id]')??[])
  .filter(node=>node.dataset.filmImageId===imageId);
 if(nodes.length===0||!track.value)return null;
 const center=track.value.getBoundingClientRect().left+track.value.clientWidth/2;
 const preferred=nodes.find(node=>{
  const rect=node.getBoundingClientRect();
  return pointed!==null&&pointed.x>=rect.left&&pointed.x<rect.right;
 });
 return preferred??nodes.reduce((a,b)=>{
  const ac=a.getBoundingClientRect(),bc=b.getBoundingClientRect();
  return Math.abs((ac.left+ac.right)/2-center)<=Math.abs((bc.left+bc.right)/2-center)?a:b;
 });
}
async function requestWorkerFocus(decision:Extract<FilmFocusDecision,{kind:'worker-webgpu'}>){
 if(!focusReady||!focusWorker||!layoutPlan.value||!focusCanvas.value||!ownsFilmFocusHost(focusHostToken))return;
 await nextTick();
 if(disposed||!focusReady||!focusWorker||decision.imageId!==activeImageId.value||
    decision.layoutRevision!==layoutPlan.value?.layoutRevision)return;
 const slot=focusedSlot(decision.imageId),chunk=decision.chunk;
 if(!slot){focusFailed('FILM_FOCUS_OVERLAY_GEOMETRY_DRIFT');return;}
 const rect=chunk.sourceRectPx;
 const left=slot.offsetLeft+(rect.x/chunk.sourceWidthPx)*slot.offsetWidth;
 const top=slot.offsetTop+(rect.y/chunk.sourceHeightPx)*slot.offsetHeight;
 const width=slot.offsetWidth*rect.width/chunk.sourceWidthPx;
 const height=slot.offsetHeight*rect.height/chunk.sourceHeightPx;
 const dpr=window.devicePixelRatio||1;
 const physicalWidth=Math.round(width*dpr),physicalHeight=Math.round(height*dpr);
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||
    physicalWidth<1||physicalHeight<1){focusFailed('FILM_FOCUS_OVERLAY_GEOMETRY_INVALID');return;}
 focusOverlayStyle.value={left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`};
 focusOverlayVisible.value=false;
 const generation=++workerFocusGeneration;
 const identity:FilmFocusRequestIdentity={
  imageId:decision.imageId,interactionGeneration:selection.value.generation,
  focusGeneration:generation,layoutRevision:decision.layoutRevision,
  assetRevision:chunk.assetRevision,deviceGeneration:focusDeviceGeneration,
  hostGeneration:focusHostGeneration,
 };
 focusIdentity=identity;focusRequestCount++;
 const message:FilmFocusRequest={kind:'focus',identity,chunk,
  surfacePx:{width:physicalWidth,height:physicalHeight}};
 focusWorker.postMessage(message);
}
async function syncFocus(){
 if(disposed||!root.value)return;
 if(!layoutPlan.value){
  focusDecision.value={kind:'static',reason:'FILM_FOCUS_HOST_HIDDEN',imageId:activeImageId.value};
  retireFocusWorker();return;
 }
 const currentDecision=decideFilmFocus({
  selection:selection.value,layoutRevision:layoutPlan.value.layoutRevision,
  focusGeneration:workerFocusGeneration+1,policy:focusPolicy(),
  manifest:legacyFocusManifest,approvals:homeFilmApprovedFocusPublications,
  origin:window.location?.origin??'http://localhost',
 });
 const blockedKey=`${selection.value.generation}:${layoutPlan.value.layoutRevision}`;
 const decision:FilmFocusDecision=currentDecision.kind==='worker-webgpu'&&
  focusDisabledForGeneration===blockedKey?
  {kind:'css',imageId:currentDecision.imageId,reason:focusFault.value??'FILM_FOCUS_GPU_UNAVAILABLE'}:
  currentDecision;
 focusDecision.value=decision;
 if(decision.kind!=='worker-webgpu'){
  retireFocusWorker();return;
 }
 if(!focusCanvas.value){focusFailed('FILM_FOCUS_GPU_UNAVAILABLE');return;}
 if(!focusHostToken)focusHostToken=allocateFilmFocusHostToken();
 claimFilmFocusHost(focusHostToken,()=>retireFocusWorker());
 if(!focusWorker){
  const generation=++focusHostGeneration,epoch=++focusInitEpoch;
  let offscreen:OffscreenCanvas;
  try {offscreen=focusCanvas.value.transferControlToOffscreen();}
  catch {focusFailed('FILM_FOCUS_GPU_UNAVAILABLE');return;}
  const worker=new Worker(new URL('../../workers/home-film-focus.ts',import.meta.url),{type:'module'});
  focusWorker=worker;focusReady=false;
  worker.onmessage=(event:MessageEvent<FilmFocusResponse>)=>{
   const m=event.data;
   if(disposed||worker!==focusWorker||generation!==focusHostGeneration||epoch!==focusInitEpoch)return;
   switch(m.kind){
    case 'ready':{
     if(m.hostGeneration!==generation){focusStaleCount++;return;}
     focusDeviceGeneration=m.deviceGeneration;focusReady=true;
     if(focusDecision.value.kind==='worker-webgpu')void requestWorkerFocus(focusDecision.value);
     return;
    }
    case 'rendered':{
     if(!filmFocusResponseCurrent(m,focusIdentity)||
        selection.value.generation!==m.identity.interactionGeneration||
        !ownsFilmFocusHost(focusHostToken)||
        layoutPlan.value?.layoutRevision!==m.identity.layoutRevision){
       focusStaleCount++;return;
     }
     focusOverlayVisible.value=true;return;
    }
    case 'failed':{
     if(m.identity.hostGeneration!==undefined&&m.identity.hostGeneration!==generation){
      focusStaleCount++;return;
     }
     if(m.identity.focusGeneration!==undefined&&m.identity.focusGeneration!==focusIdentity?.focusGeneration){
      focusStaleCount++;return;
     }
     focusFailed(m.reason);return;
    }
   }
  };
  worker.onerror=()=>focusFailed('FILM_FOCUS_WORKER_FAILED');
  const init:FilmFocusRequest={kind:'init',protocol:'film-focus-v1',hostGeneration:generation,canvas:offscreen};
  worker.postMessage(init,[offscreen]);return;
 }
 if(focusReady)await requestWorkerFocus(decision);
}
function readAnchor():FilmViewportAnchor|null{
 const bounds=track.value?.getBoundingClientRect();
 if(!bounds)return null;
 return captureFilmViewportAnchor(allSlotRects(),bounds.left+bounds.width/2,bounds.top+bounds.height/2);
}
function measureCycle(){
 const slots=rail.value?.children;
 if(!slots||slots.length<4)return 0;
 return slots[3]!.getBoundingClientRect().left-slots[0]!.getBoundingClientRect().left;
}
/** Resolved before any WAAPI startup; one layout change consumes one generation. */
function emitPaintGeometry(): void {
 const current = layoutPlan.value, surface = track.value;
 if (!current || !surface || !root.value || !isVisible()) return;
 const bounds = surface.getBoundingClientRect();
 if (bounds.width <= 0 || bounds.height <= 0) return;
 // The Figma Hero may clip the paint when its responsive SVG presentation is shorter
 // than the 815px source frame. Report only actual visible photo pixels to the Owner.
 const host = root.value.closest?.('.smd-figma-scene-section--hero');
 const clip = host?.getBoundingClientRect();
 const rawTop = bounds.top + (current.slots[0]?.presentationTopCssPx??0);
 const rawBottom = rawTop + current.presentationHeightCssPx;
 const visibleTop = Math.max(rawTop,bounds.top,clip?.top??bounds.top);
 const visibleBottom = Math.min(rawBottom,bounds.bottom,clip?.bottom??bounds.bottom);
 const paintedHeight = Math.max(0,visibleBottom-visibleTop);
 if (paintedHeight<=0) return;
 root.value.dataset.filmPaintedHeight=String(paintedHeight);
 emit('film-paint-geometry', {
  owner:'HomeHeroFilm',
  viewportRectCss:{left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height},
  paintedTopCss:visibleTop-bounds.top,
  paintedHeightCss:paintedHeight,
  layoutRevision:current.layoutRevision,generation:layoutRevision,
 });
}
/** Resolved before any WAAPI startup; one layout change consumes one generation. */
async function resize(){
 if(disposed||!root.value||!track.value||!rail.value)return;
 const geometryKey=`${window.innerWidth}:${root.value.clientWidth}:${viewportPaintHeight.value??'dom'}:${root.value.clientHeight}:${window.devicePixelRatio||1}:${document.hidden}:${reduced?.matches}:${fineQuery?.matches}:${lastPointerKind}:${sourceLayoutRevision}`;
 if(geometryKey===lastGeometryKey)return;
 lastGeometryKey=geometryKey;
 const expected=++resizeEpoch;
 const nextMode=filmMotionMode(window.innerWidth,isVisible()&&!document.hidden,!!reduced?.matches,
  {fineHover:!!fineQuery?.matches,actualPointerType:lastPointerKind});
 const previous=mode(),anchor=readAnchor();
 candidateAdmitted=false;
 const wasDesktop=previous==='desktop-lut';
 if(wasDesktop)freeze();
 windReady.value=false;
 clearDwell();clearTimeout(pointerIdle);pointerIdle=undefined;pointer=null;
 gesture={kind:'idle'};cancelFocus();retireFocusWorker();
 try {
  const desiredHeight=viewportPaintHeight.value??root.value.getBoundingClientRect().height;
  layoutPlan.value=nextMode==='static'&&!isVisible()?null:planFullViewportFilmLayout({
   frameHeightCssPx:FILM_FRAME_HEIGHT_CSS_PX,
   containerWidthCssPx:root.value.clientWidth,
   presentationHeightCssPx:desiredHeight,
   devicePixelRatio:window.devicePixelRatio||1,
   mode:nextMode,sourceRevision:sourceLayoutRevision,images:sourceImages,
  });
  root.value.dataset.filmSourcePixelUpscaleCount=String(layoutPlan.value?.unapprovedUpscaleCount??0);
  root.value.dataset.filmPaintPolicy='FILM-INTRO-VIEWPORT-FILL-R4';
  root.value.dataset.filmLayoutStatus=layoutPlan.value?.constraintStatus??'HIDDEN';
  // Layout Planner owns photo dimensions only. Never write a height into Figma Hero.
  root.value.dataset.filmPaintedHeight=String(layoutPlan.value?.presentationHeightCssPx??0);
 }catch(error){setFault(error instanceof Error?error.message:'FILM_LAYOUT_INPUT_INVALID');return;}
 layoutRevision++;const generation=motionGeneration()+1;
 switch(nextMode){
  case 'desktop-lut':transport.value={kind:'desktop-lut',generation,layoutRevision};copies.value=8;break;
  case 'native-swipe':transport.value={kind:'native-swipe',generation,layoutRevision};copies.value=1;break;
  case 'static':transport.value={kind:'static',generation,reason:reduced?.matches?'reduced-motion':'hidden'};break;
 }
 await nextTick();
 if(disposed||expected!==resizeEpoch||!root.value||!rail.value||!track.value)return;
 emitPaintGeometry();
 if(nextMode==='native-swipe'){
  animation?.cancel();plan=null;cycle=0;speed=0;
  rail.value.style.transform='none';
  // One explicit transport-owner handoff, never an inertial scroll reset.
  if(anchor&&previous!=='native-swipe'){
   const rect=track.value.getBoundingClientRect();
   try {
    const nextScroll=positionFilmAnchor(anchor,allSlotRects(),rect.left,
     track.value.scrollLeft,null,Math.max(0,track.value.scrollWidth-track.value.clientWidth));
    if(Math.abs(nextScroll-track.value.scrollLeft)>0.01)track.value.scrollLeft=nextScroll;
   }catch{setFault('FILM_MOTION_ANCHOR_UNRESOLVED');}
  }
  void syncFocus();
  return;
 }
 if(nextMode==='static'){
  animation?.cancel();plan=null;speed=0;void syncFocus();return;
 }
 if(previous==='native-swipe')track.value.scrollLeft=0; // mode handoff only, not gesture handling
 rail.value.style.transform='none';
 cycle=measureCycle();
 if(!Number.isFinite(cycle)||cycle<=0){setFault('FILM_MOTION_ANCHOR_UNRESOLVED');return;}
 if(anchor){
  try {
   const rect=track.value.getBoundingClientRect();
   phase=positionFilmAnchor(anchor,allSlotRects(),rect.left,0,cycle,0);
  }catch{setFault('FILM_MOTION_ANCHOR_UNRESOLVED');}
 }else if(previous!=='static')setFault('FILM_MOTION_ANCHOR_UNRESOLVED');
 phase=mod(phase);
 rail.value.style.transform=`translateX(${-phase}px)`;
 speed=0;target=selection.value.kind==='committed'?0:curve.base;
 // No two-keyframe substitute on LUT corruption: retain static pixels, report fault.
 try{
  admitFilmWindLut(bakedWindLut);
  if(!await verifyFilmWindLutDigest(bakedWindLut))throw new Error('FILM_WIND_LUT_DIGEST_MISMATCH');
  if(disposed||expected!==resizeEpoch||!desktopAllowed())return;
  windReady.value=true;
  if(target!==0)install(target,curve.startMs);
 }catch(error){
  windReady.value=false;
  setFault(error instanceof Error?error.message:'FILM_WIND_LUT_INVALID');
 }
 if(props.motionProfile==='pointer-rate-candidate')void qualifyRateCandidate(generation);
 refreshPointerCandidate();
 void syncFocus();
}
async function qualifyRateCandidate(generation:number){
 try{
  admitFilmRateLut(bakedRateLut);
  const match=await verifyFilmRateLutDigest(bakedRateLut);
  if(!match)throw new Error('FILM_MOTION_LUT_REVISION_MISMATCH');
  if(!disposed&&generation===motionGeneration()&&desktopAllowed())candidateAdmitted=true;
 }catch(error){
  candidateAdmitted=false;
  setFault(error instanceof Error?error.message:'FILM_MOTION_LUT_REVISION_MISMATCH');
 }
}
function environment(){
 void resize();
}
watch(()=>props.paintHeightCssPx,()=>{void nextTick().then(()=>resize());});
function down(e:PointerEvent){
 if(e.pointerType!=='touch'||(e.target as Element).closest('button,a'))return;
 markPointerKind('touch');
 if(!mobileAllowed()){
  // Hold the Tap candidate across the async mobile transport handoff.
  const snapshot={pointerId:e.pointerId,x:e.clientX,y:e.clientY,timeStamp:e.timeStamp};
  void nextTick().then(()=>{
   if(!mobileAllowed()||disposed||!track.value)return;
   gesture=startNativeFilmGesture(snapshot.pointerId,motionGeneration(),
    hitImage(snapshot.x,snapshot.y)??homeFilmAssets[0]!.id,
    snapshot.x,snapshot.y,snapshot.timeStamp,track.value.scrollLeft);
  });
  return;
 }
 const id=hitImage(e.clientX,e.clientY);
 if(id===null){gesture={kind:'idle'};return;}
 gesture=startNativeFilmGesture(e.pointerId,motionGeneration(),id,
  e.clientX,e.clientY,e.timeStamp,track.value?.scrollLeft??0);
}
function up(e:PointerEvent){
 if(e.pointerType!=='touch'||!mobileAllowed())return;
 suppressTouchClick(e.clientX,e.clientY);
 const id=hitImage(e.clientX,e.clientY);
 const result=endNativeFilmGesture(gesture,e.pointerId,motionGeneration(),e.clientX,e.clientY,
  e.timeStamp,track.value?.scrollLeft??0,id);
 gesture={kind:'idle'};
 if(result.kind==='tap')commit(result.imageId,'touch');
}
function scroll(){
 if(mode()!=='native-swipe')return;
 gesture=nativeFilmGestureScrolled(gesture,motionGeneration());
}
function cancelTouch(e:PointerEvent){
 if(e.pointerType==='touch'){
  gesture={kind:'cancelled',generation:motionGeneration(),reason:'pointercancel'};
  suppressTouchClick(e.clientX,e.clientY);return;
 }
 if(e.pointerType==='mouse'){
  cancelCandidate('pointercancel');leave(e);
 }
}
function wheel(e:WheelEvent){
 if(!desktopAllowed()||!filmHorizontal(e)||selection.value.kind==='committed'||!e.cancelable)return;
 e.preventDefault();
 freeze();phase=mod(phase+(e.deltaX||e.deltaY));
 rail.value!.style.transform=`translateX(${-phase}px)`;
 speed=0;target=hovered.value?0:curve.base;
 if(target!==0)install(target,curve.startMs);
 refreshPointerCandidate();
}
watch(selection,(next,previous)=>{
 void syncFocus();
 if(desktopAllowed()){
  switch(next.kind){
   case 'committed':request(0,curve.enterMs);return;
   case 'idle':if(!hovered.value&&target===0)request(curve.base,curve.leaveMs);return;
   case 'preview':case 'releasing':return;
  }
 }
 if(mobileAllowed()&&next.kind==='committed'&&
    (previous.kind!=='committed'||previous.imageId!==next.imageId))void presentMobileFocus(next.imageId);
});
onMounted(()=>{
 reduced=matchMedia('(prefers-reduced-motion: reduce)');
 mobileQuery=matchMedia('(max-width:1099px)');
 fineQuery=matchMedia('(hover:hover) and (pointer:fine)');
 observer=new ResizeObserver(()=>{void resize();});observer.observe(root.value!);
 reduced.addEventListener('change',environment);
 mobileQuery.addEventListener('change',environment);
 fineQuery.addEventListener('change',environment);
 document.addEventListener('pointerdown',outsidePointerDown,true);
 document.addEventListener('visibilitychange',environment);
 void resize();
});
onBeforeUnmount(()=>{
 disposed=true;resizeEpoch++;clearDwell();clearTimeout(pointerIdle);invalidateRate();cancelFocus();retireFocusWorker();
 observer?.disconnect();animation?.cancel();gesture={kind:'idle'};
 reduced?.removeEventListener('change',environment);
 mobileQuery?.removeEventListener('change',environment);
 fineQuery?.removeEventListener('change',environment);
 document.removeEventListener('pointerdown',outsidePointerDown,true);
 document.removeEventListener('visibilitychange',environment);
});
</script>
<template>
 <div ref="root" class="smd-hero-film" data-film-stage="FILM-R13-RESTORE-CF5-CF6"
  data-film-selection-contract="FILM-R13-RESTORE-CF1-CF2"
  data-film-fill="intro-viewport" :style="rootPaintStyle"
  :data-film-mode="transport.kind" :data-film-motion-profile="props.motionProfile"
  data-film-wind-revision="FILM-WIND-LUT-V1" :data-film-wind-ready="windReady?'true':'false'"
  :data-film-selection-kind="selection.kind" :data-film-selected-id="activeImageId??''"
  :data-film-editorial-admission="editorialStatus"
  :data-film-layout-revision="layoutPlan?.layoutRevision??'SSR'"
  :data-film-layout-status="layoutPlan?.constraintStatus??'SSR_PENDING'"
  :data-film-frame-height="FILM_FRAME_HEIGHT_CSS_PX"
  :data-film-focus-kind="domFocusKind" :data-film-focus-reason="domFocusReason"
  :data-film-focus-request-count="focusRequestCount" :data-film-focus-stale-count="focusStaleCount"
  @pointerenter="enter" @pointermove="move" @pointerleave="leave"
  @pointerdown="down" @pointerup="up" @pointercancel="cancelTouch"
  @click="click" @keydown="key" @wheel="wheel">
  <div ref="track" class="smd-hero-film__track" @scroll="scroll" role="region" aria-label="시공 현장 사진 필름">
   <div ref="rail" class="smd-hero-film__rail" :class="{'is-hovered':hovered}">
    <figure v-for="(asset,index) in displayAssets" :key="`${asset.id}-${index}`"
      class="smd-hero-film__slot"
      :style="slotStyle(index)"
      :class="{'is-pointer-slot':hoveredSlotIndex===index,
       'is-current':transport.kind==='native-swipe'&&selection.kind==='committed'&&selection.imageId===asset.id,
       'is-selected':selection.kind==='committed'&&selection.imageId===asset.id}"
      :data-film-image-id="asset.id" :data-film-copy-index="Math.floor(index/homeFilmAssets.length)"
      aria-hidden="true" inert>
     <img :src="asset.src" alt="" :width="asset.width" :height="asset.height" decoding="async" draggable="false" />
     <span class="smd-hero-film__focus-layer" aria-hidden="true" />
    </figure>
    <canvas ref="focusCanvas" :key="focusCanvasEpoch" class="smd-hero-film__gpu-overlay"
      :style="focusOverlayStyle" :data-film-focus-visible="focusOverlayVisible"
      :aria-hidden="true" tabindex="-1" />
   </div>
  </div>
  <!-- Exactly one SSR semantic record per logical image, independent of repeating paint copies. -->
  <nav class="smd-hero-film__semantic" aria-label="시공 사진 작품 선택">
   <div v-for="item in editorial" :key="item.asset.id" class="smd-hero-film__semantic-item"
     :class="{'is-current':isCurrent(item.asset.id),'is-approved':item.source.kind==='approved'}"
     :data-film-semantic-id="item.asset.id">
    <figure class="smd-hero-film__original">
     <img class="smd-hero-film__semantic-image" :src="item.asset.src" :alt="item.asset.alt"
       :width="item.asset.width" :height="item.asset.height" loading="lazy" />
     <figcaption v-if="item.source.kind==='approved'" class="smd-hero-film__caption">
      <strong class="smd-hero-film__title">{{item.source.title}}</strong>
      <span class="smd-hero-film__description">{{item.source.description}}</span>
     </figcaption>
    </figure>
    <div class="smd-hero-film__actions">
     <button type="button" class="smd-hero-film__commit"
       :aria-pressed="selection.kind==='committed' && selection.imageId===item.asset.id"
       @focus="keyboardFocus(item.asset.id)" @click.stop="commit(item.asset.id,'keyboard')">
       사진 {{item.index+1}} 선택
     </button>
     <template v-if="item.source.kind==='approved'">
      <NuxtLink v-if="item.source.linkKind==='internal'" :to="item.source.href" class="smd-hero-film__detail">자세히 보기</NuxtLink>
      <a v-else :href="item.source.href" target="_blank" rel="noopener noreferrer" class="smd-hero-film__detail">자세히 보기</a>
     </template>
    </div>
   </div>
  </nav>
 </div>
</template>
<style scoped>
/* The source Figma frame remains 815px. Runtime Vue owns the intro viewport paint height. */
.smd-hero-film {position:absolute;inset:0 auto auto 0;width:100%;height:100%;background:#fff;
 overflow:hidden;--film-gap:0px;container-type:inline-size;--film-target-count:2;
 --film-ssr-pixel-cap:637.5px;}
.smd-hero-film__track {height:100%;overflow:hidden;}
.smd-hero-film[data-film-mode="native-swipe"] .smd-hero-film__track {
 overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;touch-action:auto;
}
.smd-hero-film__rail {position:relative;display:flex;align-items:flex-start;height:100%;
 gap:var(--film-gap);pointer-events:none;}
.smd-hero-film[data-film-mode="native-swipe"] .smd-hero-film__rail {transform:none;}
.smd-hero-film__slot {flex:0 0 auto;margin:0;position:relative;overflow:visible;
 height:min(815px,var(--film-ssr-pixel-cap),calc(100cqw * 0.6640625 / var(--film-target-count)));
 aspect-ratio:1920 / 1275;}
.smd-hero-film__slot img {display:block;width:100%;height:100%;max-width:100%;
 object-fit:contain;transition:filter 950ms cubic-bezier(.22,.61,.36,1);}
.smd-hero-film__rail.is-hovered .smd-hero-film__slot.is-pointer-slot img {filter:brightness(1.035);}
.smd-hero-film__focus-layer {position:absolute;inset:0;pointer-events:none;opacity:0;
 background:rgba(255,255,255,.045);}
.smd-hero-film__slot.is-selected .smd-hero-film__focus-layer {opacity:1;}
.smd-hero-film__gpu-overlay {position:absolute;pointer-events:none;opacity:0;z-index:1;
 width:0;height:0;touch-action:none;}
.smd-hero-film__gpu-overlay[data-film-focus-visible="true"] {opacity:1;}
.smd-hero-film[data-film-mode="native-swipe"] .smd-hero-film__slot.is-current img {transform:scale(1.025);}
.smd-hero-film__semantic {position:absolute;inset:auto 0 16px;z-index:2;pointer-events:none;
 display:flex;justify-content:center;}
.smd-hero-film__semantic-item {position:absolute;width:1px;height:1px;overflow:hidden;
 clip-path:inset(50%);white-space:nowrap;pointer-events:none;}
.smd-hero-film__semantic-item.is-current.is-approved,
.smd-hero-film__semantic-item:focus-within {position:relative;width:min(94%,530px);height:auto;
 overflow:visible;clip-path:none;white-space:normal;pointer-events:auto;padding:12px 16px;
 background:rgba(255,255,255,.94);color:#141414;box-shadow:0 4px 18px rgba(0,0,0,.12);}
.smd-hero-film__semantic-image {position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);}
.smd-hero-film__caption {display:flex;flex-direction:column;gap:4px;}
.smd-hero-film__title {font-size:18px;font-weight:650;line-height:1.3;}
.smd-hero-film__description {font-size:13px;line-height:1.5;}
.smd-hero-film__actions {display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;}
.smd-hero-film__commit,.smd-hero-film__detail {color:inherit;font:inherit;font-size:13px;
 padding:6px 9px;text-decoration:underline;text-underline-offset:3px;}
.smd-hero-film__commit {border:0;background:transparent;cursor:pointer;}
.smd-hero-film__commit:focus-visible,.smd-hero-film__detail:focus-visible {
 outline:2px solid currentColor;outline-offset:3px;}
@media(min-width:3000px){.smd-hero-film {--film-target-count:4;}}
@media(min-width:1100px) and (max-width:1599px){.smd-hero-film {--film-target-count:1;}}
@media(max-width:1099px){.smd-hero-film {--film-target-count:1.25;}}
/* SSR cannot know exact DPR. Conservative caps prevent pre-hydration pixel enlargement. */
@media(min-resolution:2dppx){.smd-hero-film {--film-ssr-pixel-cap:425px;}}
@media(min-resolution:3dppx){.smd-hero-film {--film-ssr-pixel-cap:318.75px;}}
@media(min-resolution:4dppx){.smd-hero-film {--film-ssr-pixel-cap:255px;}}
/* SSR has no DPR/viewport width: fill the explicit Vue Intro Frame before hydration. */
.smd-hero-film[data-film-fill="intro-viewport"] .smd-hero-film__slot {
 height:100%;width:auto;aspect-ratio:1920/1275;
}
@media(prefers-reduced-motion:reduce){.smd-hero-film__slot img {transition:none;}}
</style>
