import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { installRecoveryBackend, seededRun, RUN_ID } from '../../../../../tests/e2e/fixtures/oneshotRecovery';
const dir = 'assets/design/companion-beta/qa/independent';
test('visual review snapshots', async ({ page, browser }) => {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)) return route.continue();
    if (u.origin !== 'http://localhost:5173' || u.pathname.startsWith('/api/')) return route.abort();
    return route.fallback();
  });
  await page.goto('/companion-chat-preview.html');
  const input = page.getByRole('textbox', { name: 'Message Grifon', exact: true });
  await expect(input).toBeVisible();
  await expect(page.locator('iframe[data-ready="true"]')).toBeVisible();
  const metrics = [];
  for (const [width,height] of [[375,667],[390,844],[1280,900]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:`${dir}/initial-${width}.png`});
    metrics.push(await page.evaluate(() => ({width:innerWidth, overflow:document.documentElement.scrollWidth>innerWidth, controls:[...document.querySelectorAll('button,textarea,input')].filter(e=>e.getBoundingClientRect().width).map(e=>({label:e.getAttribute('aria-label')||e.textContent, height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize, weight:getComputedStyle(e).fontWeight, family:getComputedStyle(e).fontFamily}))})));
  }
  await page.setViewportSize({width:375,height:667});
  for(const text of ['Coffee for parents','North Coffee','Cold brew','Two bottles','199']) {
    await input.fill(text); await input.press('Enter');
    await expect(page.getByRole('status',{name:'Grifon is typing',exact:true})).toHaveCount(0);
  }
  await page.getByRole('button',{name:'Generate storyboard',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`${dir}/disabled-generate-375.png`});
  await page.getByLabel('Product photo',{exact:true}).setInputFiles({name:'bad.html',mimeType:'text/html',buffer:Buffer.from('invalid')});
  await expect(page.getByText('Choose a JPG, PNG or WebP image smaller than 20 MB.')).toBeVisible();
  await page.getByText('Choose a JPG, PNG or WebP image smaller than 20 MB.').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${dir}/upload-error-375.png`});
  const zoomContext=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2});
  const zoom=await zoomContext.newPage();
  await zoom.route('**/*',route=>{const u=new URL(route.request().url()); if(u.origin!=='http://localhost:5173' && !['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname) || u.pathname.startsWith('/api/')) return route.abort(); return route.continue();});
  await zoom.goto('http://localhost:5173/companion-chat-preview.html');
  await expect(zoom.getByRole('textbox',{name:'Message Grifon',exact:true})).toBeVisible();
  await zoom.locator('.companion-composer').screenshot({path:`${dir}/composer-200-percent.png`});
  await zoom.getByRole('button',{name:'Studio',exact:true}).screenshot({path:`${dir}/studio-pair-200-percent.png`});
  await zoom.getByRole('button',{name:'New chat',exact:true}).screenshot({path:`${dir}/new-chat-pair-200-percent.png`});
  await zoomContext.close();
  writeFileSync(`${dir}/visual-metrics.json`,JSON.stringify(metrics,null,2));
});
for (const outcome of ['close','network-error']) test(`unconfirmed non-video request blocks repeat after ${outcome}`, async ({ page,context }) => {
  const seed=seededRun('storyboard');
  seed.row.status='running'; seed.row.current_stage='scene_images'; seed.row.artifacts.gate=null;
  seed.row.stages.find(s=>s.id==='scene_images')!.status='pending'; seed.scenes[0].image_url=null;
  let calls=0;
  const install=async (p: typeof page) => {
    const backend=await installRecoveryBackend(p,seed);
    await p.exposeFunction('recordIndependentImageCall',()=>{calls++;});
    await p.route(/\/services\/geminiService\.ts(?:\?.*)?$/, route => {
      if(route.request().url().includes('independent-original')) return route.fallback();
      return route.fulfill({contentType:'application/javascript',body:`export * from '/services/geminiService.ts?independent-original'; export const generateSceneImage=async()=>{await window.recordIndependentImageCall(); ${outcome==='close'?'return new Promise(()=>{});':"throw new TypeError('Failed to fetch');"}};`});
    });
    await p.addInitScript(id=>localStorage.setItem('osa_producer_companion:recovery-user',id),RUN_ID);
    await p.goto('/app?experience=companion'); return backend;
  };
  const first=await install(page);
  await page.getByRole('button',{name:'Resume saved progress',exact:true}).click();
  await expect.poll(()=>calls).toBe(1);
  await page.close();
  const second=await context.newPage(); const backend=await install(second);
  await second.getByRole('button',{name:'Resume saved progress',exact:true}).click();
  await expect(second.getByText(/An earlier production request could not be confirmed/).first()).toBeVisible();
  expect(calls).toBe(1);
  await second.screenshot({path:`${dir}/blocked-after-${outcome}.png`});
  // Read-only saved output remains reachable without allowing a paid retry.
  const completed=seededRun('storyboard'); backend.row=completed.row; backend.scenes=completed.scenes;
  await second.getByRole('button',{name:'Retry saved ad',exact:true}).click();
  await second.getByRole('button',{name:'Open storyboard',exact:true}).click();
  await expect(second.getByLabel('Storyboard review',{exact:true})).toBeVisible();
  expect(calls).toBe(1);
  writeFileSync(`${dir}/blocked-after-${outcome}.json`,JSON.stringify({calls,storedStage:seed.row.stages.find(s=>s.id==='scene_images'),unexpected:[...first.unexpected,...backend.unexpected],readOnlyOutput:'visible',meaning:'One simulated image submission; unresolved receipt prevents repeat, saved output remains viewable.'},null,2));
});

// Unlike the original bare-service-error reproducer, these tests exercise the
// real transport boundary which classifies ambiguous outcomes before either retry loop.
for(const mode of ['503','504','network','bodyloss','invalid200']) {
  for(const service of ['gemini','voice','render','veo','kling','kling-omni']) test(`real ${service} transport tags ${mode} without replay`,async({page})=>{
    const backend=await installRecoveryBackend(page);
    let calls=0;
    const endpoint=service==='gemini'?'/api/gemini/text':service==='voice'?'/api/voice/consolidate':service==='veo'?'/api/gemini/video':service==='kling'?'/api/kling/video':service==='kling-omni'?'/api/kling/omni-video':'/api/render/final';
    await page.route(`**${endpoint}`,route=>{
      calls++;
      if(mode==='network') return route.abort('connectionfailed');
      if(mode==='bodyloss') return route.fulfill({status:200,contentType:'application/json',body:'{"truncated":'});
      if(mode==='invalid200') return route.fulfill({status:200,json:{}});
      return route.fulfill({status:Number(mode),json:{error:'upstream_unknown'}});
    });
    await page.goto('/app?experience=companion');
    const result=await page.evaluate(async service=>{
      try{
        if(service==='gemini'){
          const mod=await import('/services/geminiService.ts');
          await mod.generateAdScript({product:'Fixture coffee',features:'Coffee',scriptType:'MrBeast'},'Fixture','English');
        }else if(service==='voice'){
          const mod=await import('/services/voiceConsolidationService.ts');
          await mod.consolidateVoices([],'fixture-voice');
        }else if(['veo','kling','kling-omni'].includes(service)){
          const mod=await import('/services/geminiService.ts');
          const models={veo:'Veo_3.1_Lite',kling:'Kling_3_0','kling-omni':'Kling_O1'};
          await mod.submitVideo({model:models[service],prompt:'Fixture coffee',duration:service==='veo'?6:5,resolution:'720p',aspectRatio:'9:16',audioEnabled:false,startFrame:'data:image/png;base64,ZmFrZQ=='});
        }else{
          const mod=await import('/services/finalRenderService.ts');
          await mod.startFinalRender({});
        }
        return {fulfilled:true,unknown:false};
      }catch(error){return {fulfilled:false,unknown:(error as any).generationOutcomeUnknown===true};}
    },service);
    writeFileSync(`${dir}/transport-${service}-${mode}${result.unknown?'':'-red'}.json`,JSON.stringify({result,calls,unexpected:backend.unexpected},null,2));
    expect(result).toEqual({fulfilled:false,unknown:true}); expect(calls).toBe(1);
    expect(backend.unexpected).toEqual([]);
    writeFileSync(`${dir}/transport-${service}-${mode}.json`,JSON.stringify({result,calls,unexpected:backend.unexpected},null,2));
  });
  test(`real image transport prevents orchestrator automatic replay after ${mode}`,async({page})=>{
    const seed=seededRun('storyboard'); seed.row.status='running'; seed.row.current_stage='scene_images'; seed.row.artifacts.gate=null;
    seed.row.stages.find(s=>s.id==='scene_images')!.status='pending'; seed.scenes[0].image_url=null;
    const backend=await installRecoveryBackend(page,seed); let calls=0;
    await page.route('**/api/gemini/image',route=>{
      calls++;
      if(mode==='network') return route.abort('connectionfailed');
      if(mode==='bodyloss') return route.fulfill({status:200,contentType:'application/json',body:'{"truncated":'});
      if(mode==='invalid200') return route.fulfill({status:200,json:{}});
      return route.fulfill({status:Number(mode),json:{error:'upstream_unknown'}});
    });
    await page.addInitScript(id=>localStorage.setItem('osa_producer_companion:recovery-user',id),RUN_ID);
    await page.goto('/app?experience=companion');
    await page.getByRole('button',{name:'Resume saved progress',exact:true}).click();
    // Wait for the driver to settle at review: a retry-loop delay cannot be
    // mistaken for final one-call evidence.
    await expect(page.getByRole('button',{name:'Open storyboard',exact:true})).toBeVisible({timeout:30000});
    writeFileSync(`${dir}/orchestrator-transport-${mode}${calls===1?'':'-red'}.json`,JSON.stringify({calls,unexpected:backend.unexpected},null,2));
    expect(calls).toBe(1);
    await page.getByRole('button',{name:'Open storyboard',exact:true}).click();
    await page.getByRole('button',{name:'Regenerate scene 1',exact:true}).click();
    // Recovery is shown in the conversation; use the actual viewer control when present.
    const close=page.getByRole('button',{name:'Close viewer',exact:true});
    if(await close.isVisible()) await close.click();
    await expect(page.getByText(/An earlier production request could not be confirmed/).first()).toBeVisible();
    expect(calls).toBe(1);
    writeFileSync(`${dir}/orchestrator-transport-${mode}.json`,JSON.stringify({calls,unexpected:backend.unexpected,meaning:'Real Gemini image service tags the fake HTTP outcome; orchestrator does not auto-replay and unresolved receipt blocks manual regeneration.'},null,2));
  });
}

test('malformed completed final poll does not restart the render',async({page})=>{
  const backend=await installRecoveryBackend(page,seededRun('final_render'));
  let polls=0;
  await page.route('**/api/render/final/poll?*',route=>{polls++;return route.fulfill({json:{done:true,status:'done'}});});
  await page.addInitScript(id=>localStorage.setItem('osa_producer_companion:recovery-user',id),RUN_ID);
  await page.goto('/app?experience=companion');
  await page.getByRole('button',{name:'Resume saved progress',exact:true}).click();
  await expect(page.getByText(/FINAL_RENDER_INCOMPLETE_RESPONSE/).first()).toBeVisible({timeout:30000});
  expect(backend.finalStarts).toHaveLength(1);expect(polls).toBe(1);
  await page.getByRole('button',{name:'Resume saved progress',exact:true}).click();
  await expect(page.getByText(/An earlier production request could not be confirmed/).first()).toBeVisible();
  expect(backend.finalStarts).toHaveLength(1);expect(backend.unexpected).toEqual([]);
  writeFileSync(`${dir}/final-poll-incomplete.json`,JSON.stringify({starts:backend.finalStarts.length,polls,unexpected:backend.unexpected},null,2));
});

for(const [status,code] of [[422,'flow_output_invalid'],[429,'gemini_quota']] as const){
  test(`paid text ${code} cannot replay at the public transport seam`,async({page})=>{
    const backend=await installRecoveryBackend(page);let calls=0;
    await page.route('**/api/gemini/text',route=>{calls++;return route.fulfill({status,json:{error:code}});});
    await page.goto('/app?experience=companion');
    const result=await page.evaluate(async()=>{
      const mod=await import('/services/geminiService.ts');
      return Promise.race([
        mod.generateAdScript({product:'Coffee',features:'Coffee',scriptType:'Testimonial'},'Fixture','English')
          .then(()=>({fulfilled:true,unknown:false}),error=>({fulfilled:false,unknown:error.generationOutcomeUnknown===true})),
        new Promise(resolve=>setTimeout(()=>resolve({pending:true}),7000)),
      ]);
    });
    const green=calls===1&&(result as any).unknown===true;
    writeFileSync(`${dir}/paid-text-${code}-transport${green?'':'-red'}.json`,JSON.stringify({calls,result,unexpected:backend.unexpected},null,2));
    expect(result).toEqual({fulfilled:false,unknown:true});expect(calls).toBe(1);expect(backend.unexpected).toEqual([]);
  });
  test(`paid text ${code} cannot replay through the producer`,async({page})=>{
    const seed=seededRun('storyboard');seed.row.status='running';seed.row.current_stage='script';seed.row.artifacts.gate=null;
    seed.row.stages.find(stage=>stage.id==='script')!.status='pending';
    seed.row.artifacts.report={subject:'Coffee',narrativeReport:'Fixture',bigIdea:'Coffee'};
    seed.row.artifacts.businessInfo={product:'Coffee',features:'Coffee',scriptType:'Testimonial'};
    const backend=await installRecoveryBackend(page,seed);let calls=0;
    await page.route('**/api/gemini/text',route=>{calls++;return route.fulfill({status,json:{error:code}});});
    await page.addInitScript(id=>localStorage.setItem('osa_producer_companion:recovery-user',id),RUN_ID);
    await page.goto('/app?experience=companion');
    await page.getByRole('button',{name:'Resume saved progress',exact:true}).click();
    let settled=false;
    try{await expect.poll(()=>backend.row?.status,{timeout:8000}).toBe('error');settled=true;}catch{/* Record the original retry before failing the contract assertion. */}
    writeFileSync(`${dir}/paid-text-${code}-producer${calls===1&&settled?'':'-red'}.json`,JSON.stringify({calls,settled,status:backend.row?.status,unexpected:backend.unexpected},null,2));
    expect(calls).toBe(1);expect(settled).toBe(true);expect(backend.unexpected).toEqual([]);
    await page.getByRole('button',{name:'Resume saved progress',exact:true}).click();
    await expect(page.getByText(/An earlier production request could not be confirmed/).first()).toBeVisible();expect(calls).toBe(1);
  });
}
