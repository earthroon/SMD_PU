/** SMD_HOME_INTERACTION_R1 physical browser witness.
 * Run against an already-started local Nuxt server. No deployment or page mutation.
 * Node 22+; Chrome / Edge headless with CDP over native WebSocket.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const arg = (key, otherwise) => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : otherwise; };
const url = arg('--url', 'http://127.0.0.1:3000/');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(arg('--out', join(root, 'artifacts/smd-home-interaction-r1/browser-receipt.json')));
if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/$/.test(url)) {
  throw new Error('SMD_INTRO_BROWSER_LOCAL_URL_ONLY');
}
const candidates = [process.env.SMD_CHROME_PATH, process.env.CHROME_PATH,
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Microsoft/Edge/Application/msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
const chrome = candidates.find(existsSync);
if (!chrome) throw new Error('SMD_INTRO_CHROME_NOT_FOUND: configure SMD_CHROME_PATH');
const temp = join(tmpdir(), `smd-intro-browser-${randomUUID()}`);
mkdirSync(temp, { recursive: true });
const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--no-first-run', '--disable-extensions',
  '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${temp}`, 'about:blank'],
  { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let socket;
let sequence = 0;
const pending = new Map();
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`SMD_INTRO_CDP_TIMEOUT ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); },
      reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function getPort() {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`SMD_INTRO_CHROME_EXITED_${child.exitCode}`);
    const portFile = join(temp, 'DevToolsActivePort');
    if (existsSync(portFile)) return Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    await sleep(100);
  }
  throw new Error('SMD_INTRO_CHROME_DEBUG_PORT_TIMEOUT');
}
async function evaluate(expression) {
  const value = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (value.exceptionDetails) throw new Error(`SMD_INTRO_BROWSER_EVALUATE ${value.exceptionDetails.text}`);
  return value.result?.value;
}
async function waitForDom() {
  for (let i = 0; i < 60; i++) {
    const state = await evaluate(`(() => ({ready: document.readyState,
      phase: document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]')?.dataset.introPhase ?? null,
      body: document.body?.innerText?.slice(0,100) ?? ''}))()`);
    if (state.ready === 'complete' && state.phase !== null && state.phase !== 'disabled') return state;
    if (state.ready === 'complete' && state.phase === 'disabled' && i >= 10) return state;
    await sleep(150);
  }
  throw new Error('SMD_INTRO_DOM_NOT_READY_OR_CONTENT_UNAVAILABLE');
}
async function measure() {
  return evaluate(`(() => {
    const root=document.querySelector('[data-intro-contract="SMD_HOME_INTERACTION_R1"]');
    const hero=root?.querySelector('.smd-figma-scene-section--hero');
    const bar=root?.querySelector('.smd-figma-scene-section--info-bar');
    const items=[...document.querySelectorAll('.smd-home-intro__item')];
    const rect=e=>e ? ({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,
       height:e.getBoundingClientRect().height}) : null;
    return { phase:root?.dataset.introPhase??null, admitted:root?.dataset.introAdmitted??null,
      admissionReason:root?.dataset.introAdmissionReason??null,
      releaseReason:root?.dataset.introReleaseReason??null,
      starts:Number(root?.dataset.introAnimationStarts??0), ignored:Number(root?.dataset.introIgnoredWheel??0),
      viewport:[innerWidth,innerHeight], scrollY:window.scrollY,
      hero:rect(hero), bar:rect(bar), intro:rect(root),
      barOpacity:bar?Number(getComputedStyle(bar).opacity):null,
      items:items.map(item=>({index:Number(item.dataset.introIconIndex),opacity:Number(getComputedStyle(item).opacity)})),
      headerHeight:document.querySelector('.smd-site-header')?.getBoundingClientRect().height??null,
      media:matchMedia('(min-width: 1380px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches
    };
  })()`);
}
async function navigate(width, height, touch) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: touch });
  await cdp('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await cdp('Page.navigate', { url });
  await waitForDom();
}
async function wheel(width, height, deltaY = 320) {
  await cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.floor(width/2),
    y: Math.floor(height/2), deltaX: 0, deltaY });
}
const results = [];
let failure = null;
try {
  const port = await getPort();
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find(p => p.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('SMD_INTRO_CHROME_PAGE_MISSING');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    const job = pending.get(response.id);
    if (!job) return;
    pending.delete(response.id);
    response.error ? job.reject(new Error(JSON.stringify(response.error))) : job.resolve(response);
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  for (const [width,height] of [[1920,1080],[2560,1080],[3440,1440],[3840,1080]]) {
    await navigate(width,height,false);
    const initial = await measure();
    const errors = [];
    if (initial.phase !== 'idle' || initial.admitted !== 'true') errors.push(`ADMISSION_${initial.admissionReason}`);
    if ((initial.bar?.top??0)<height-1) errors.push('INFO_BAR_VISIBLE_BEFORE_FIRST_WHEEL');
    if (initial.items.length !== 8) errors.push(`MOTION_NODE_COUNT_${initial.items.length}`);
    if (errors.length === 0) {
      await wheel(width,height);
      await sleep(50);
      for (let n=0;n<20;n++) await wheel(width,height);
      const burst = await measure();
      if (burst.starts !== 1) errors.push('WHEEL_REPLAY_OR_MISSING_START');
      if (burst.ignored !== 20) errors.push(`WHEEL_DRAIN_${burst.ignored}`);
      if (burst.phase !== 'revealing') errors.push(`WRONG_REVEAL_PHASE_${burst.phase}`);
      await sleep(1350);
      const released = await measure();
      if (released.phase !== 'released') errors.push('RELEASE_NOT_COMPLETED');
      if (released.barOpacity === null || released.barOpacity < .999) errors.push('BAR_NOT_VISIBLE');
      if (released.items.some(item => item.opacity < .999)) errors.push('ICON_NOT_VISIBLE');
      if (Math.abs((released.bar?.bottom??0)-height)>2) errors.push('INFO_BAR_FINAL_BOUNDARY_DRIFT');
      if (released.starts !== 1) errors.push('DUPLICATE_ANIMATION_START');
      await wheel(width,height);
      await sleep(550);
      const next = await measure();
      if (next.scrollY <= released.scrollY + 2) errors.push('NATIVE_SCROLL_NOT_RELEASED');
      if ((next.hero?.top??0) >= (released.hero?.top??0)-2) errors.push('STICKY_HERO_DID_NOT_EXIT');
      results.push({ width,height,initial,burst,released,next,errors });
    } else results.push({width,height,initial,errors});
    console.log(`SMD INTRO ${width}x${height}: ${errors.length ? 'FAIL '+errors.join(',') : 'BROWSER_OK'}`);
  }
  for (const [width,height] of [[390,844],[1024,768]]) {
    await navigate(width,height,true);
    const initial = await measure();
    const errors = [];
    if (initial.phase !== 'disabled' || initial.admitted !== 'false') errors.push('MOBILE_TABLET_ADMISSION_NOT_DISABLED');
    await wheel(width,height);
    await sleep(1100);
    const after = await measure();
    if (after.starts !== 0) errors.push('MOBILE_TABLET_ANIMATION_RAN');
    results.push({width,height,initial,after,errors});
    console.log(`SMD INTRO ${width}x${height} TOUCH: ${errors.length ? 'FAIL '+errors.join(',') : 'BROWSER_OK'}`);
  }
} catch (error) {
  failure = String(error?.stack ?? error);
  console.error('SMD_INTRO_BROWSER_BLOCKED_OR_FAILED', failure);
} finally {
  const report = { contract: 'SMD_HOME_INTERACTION_R1', url,
    status: failure ? 'BLOCKED' : results.some(r=>r.errors.length) ? 'FAIL' : 'PASS',
    failure, originalFigmaPixelParity: 'NOT_RUN', results };
  mkdirSync(dirname(out), {recursive:true});
  writeFileSync(out, JSON.stringify(report,null,2)+'\n');
  console.log(`SMD_INTRO_BROWSER_RECEIPT ${out}`);
  socket?.close();
  child.kill();
  await sleep(300);
  rmSync(temp,{recursive:true,force:true,maxRetries:3});
  if (report.status !== 'PASS') process.exitCode = 1;
}
