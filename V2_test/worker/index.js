const PAGE = __PAGE__;
const APP_JS = __APP_JS__;
const ROOM_BYTES = __ROOM_BYTES__;
const PRODUCT_BYTES = __PRODUCT_BYTES__;

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const EDIT_SYSTEM=`You are a production-grade scene-aware interior image editor, not a compositor.
Perform localized image editing / inpainting around the requested placement region. Re-render the inserted object as part of the photographed 3D scene.
Hard constraints:
- preserve room structure, camera angle, lens perspective, vanishing directions and framing;
- preserve the complete source canvas from edge to edge: do not crop, center-crop, zoom in, reframe or discard content at the left, right, top or bottom;
- keep the source aspect ratio. If an interface limit makes the exact ratio impossible, fit the whole source using letterbox/padding; never fill the target by cropping;
- preserve all unedited walls, floors, ceilings, doors, windows, fixtures and objects;
- preserve the original room appearance outside the requested edit region, including the exact wall/floor texture, exposure, contrast, saturation, white balance, color temperature, sensor noise and image grain;
- do not beautify, denoise, smooth, relight, recolor or restyle the background; do not apply global soft light, global tone mapping, global contrast/saturation changes or a global color-temperature shift;
- confine any necessary relighting, color spill, edge blending and shadow work to the inserted/replaced furniture and a narrow local contact area around it;
- match the product reference's shape, color, material, construction and distinctive design details;
- insert the furniture naturally at the requested normalized position and orientation;
- use realistic physical scale from supplied dimensions; otherwise infer category-appropriate scale from the floor plane, depth and nearby references;
- align the object to the supporting floor, wall, tabletop or shelf; no floating, sinking, interpenetration or wall penetration;
- preserve correct front-to-back depth ordering and occlusion with every existing object; never let objects pass through one another;
- for REPLACE, remove only the specifically replaced furniture. Preserve unrelated nearby objects and, when physically plausible, preserve independent small objects that were on or near the replaced furniture by placing them naturally on the replacement or leaving them unchanged;
- match perspective foreshortening, occlusion ordering and the existing local ambient light direction without changing the room's global exposure or color temperature;
- create physically plausible contact shadows, soft cast shadows and subtle bounced light;
- output one photorealistic interior photograph, not a collage, sticker, cutout, mockup, product-page overlay or transparent layer;
- do not copy product-page text, price tags, UI, background, watermark or surrounding props into the room.
Change only what the instruction requires.`;

const DEFAULT_PROMPTS={
  round0:`解析操作类型、基础图、商品图、点选位置、文字指令、真实尺寸、点选/文字冲突状态和落点纠错状态。识别支撑面、空间纵深、透视、光线、遮挡物和安全摆放区域。本轮只输出结构化分析，不生成图片，不重新设计房间。`,
  round1:`你是一个真实家居空间图片编辑模型。根据基础房间图片、家具商品参考图、结构化任务和用户要求完成第一次图片编辑。保持基础图片的空间结构、拍摄角度、构图和透视关系；仅修改指定对象或区域；严格参考商品外形、颜色、材质、结构和关键设计细节。ADD 不删除原有家具，REPLACE 只删除并替换用户指定的家具，不得删除无关物品；原家具上方或附近的独立小物品，在物理关系合理时应自然保留。根据透视和尺寸调整大小与角度，使商品与支撑面自然接触，并保持正确前后遮挡，禁止悬空、穿模或错误覆盖。除编辑区域外，保持原房间的墙面/地面纹理、曝光、颗粒、对比度、饱和度和色温，不得美化、磨皮、柔光、降噪或全局重新调色。输出真实室内摄影预览，不要重新设计整个房间。优先级：完成用户要求 > 商品保真 > 空间保真 > 视觉自然。`,
  round2:`基于 Round 1 中间图做一次综合修正。必须以 Image 3 原始基础房间图为背景保真基准：编辑区域之外尽量逐像素保持原房间外观，保留原墙面与地面纹理、原曝光、原图像颗粒/噪声、原对比度、原饱和度和原色温；禁止背景磨皮、柔化、降噪、美化，禁止全局柔光、全局调色、全局改变对比度/饱和度/色温。只允许在新增或替换家具的边缘、接触面和投影范围内进行必要的局部光影融合。
同时检查并修正尺寸比例、透视、接地、悬空、前后遮挡、物体穿模、墙体穿透、接触阴影、局部投影和边缘融合。建立正确的前后深度关系：已有前景物体应自然遮挡新家具，新家具只在空间关系正确时遮挡背景物体，任何家具、墙面和小物品都不得互相穿过。REPLACE 只删除被明确替换的家具；无关家具和独立小物品必须保留。原家具上方或附近的小物品若可合理存在，应原位保留或自然落在替换家具的对应支撑面上，不得无故消失。保持商品外观、目标位置、房间结构、机位、构图和所有未编辑区域不变。不得新增家具或装饰，不得重新设计商品或房间。输出应像商品真实存在于原始场景中的摄影照片，而不是拼贴图。`,
  round3:`比较基础房间图、商品参考图、用户要求、结构化任务和 Round 2 结果。检查商品一致性、位置、比例、透视、接地、阴影、穿模、遮挡、悬空、应保留物品丢失和背景漂移。明显失败时输出 FAIL 和局部纠错要求；不要因轻微压缩或审美差异判定失败。`,
  retry:`根据质量检查指出的问题，对上一轮结果做唯一一次局部纠错。只处理明确失败项，尤其是背景漂移、背景过度美化、物体穿模、错误遮挡、悬空或应保留物品丢失。以原始基础房间图恢复所有非编辑区域，保留原纹理、曝光、颗粒、对比度、饱和度和色温；局部修复不得扩散为全局柔光、调色或重绘。保持已经正确的商品外观、位置、房间结构和未编辑物品。REPLACE 只删除指定家具；合理保留附近独立小物品。不得借机重做房间、改变商品款式或新增装饰。`
};
const DEFAULT_PROMPT_VERSION='prompt-v1',DEFAULT_PROMPT_UPDATED_AT='2026-10-07T12:00:00.000Z';

function promptSnapshot(input){
  const raw=input?.promptSnapshot||{},provided=raw.prompts||{},prompts={};
  for(const key of ['round0','round1','round2','round3']){const value=provided[key];prompts[key]=typeof value==='string'&&value.trim()?value.trim().slice(0,12000):DEFAULT_PROMPTS[key]}
  return{prompt_version:typeof raw.prompt_version==='string'&&raw.prompt_version.trim()?raw.prompt_version.slice(0,80):DEFAULT_PROMPT_VERSION,last_updated_at:typeof raw.last_updated_at==='string'&&raw.last_updated_at?raw.last_updated_at.slice(0,80):DEFAULT_PROMPT_UPDATED_AT,prompts};
}

function stageTiming(started,ended=Date.now()){const duration=ended-started;return{start_time:new Date(started).toISOString(),end_time:new Date(ended).toISOString(),duration,durationMs:duration}}

function corsHeaders(request){const origin=request.headers.get('origin')||'*';return{"access-control-allow-origin":origin,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","vary":"origin"}}
function json(data,status=200,request){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...corsHeaders(request)}})}
function assetResponse(base64,type){const raw=atob(base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Response(bytes,{headers:{"content-type":type,"cache-control":"public, max-age=86400"}})}
function assertImageInput(value,name){if(typeof value!=='string')throw new Error(`${name} 必须是有效图片`);if(/^data:image\/(png|jpeg|webp);base64,/i.test(value)){if(value.length>14_000_000)throw new Error(`${name} 超过 10MB，请压缩后重试`);return}if(/^https:\/\/[^\s]{1,4096}$/i.test(value))return;throw new Error(`${name} 必须是 PNG/JPEG/WebP Data URL 或 HTTPS 图片地址`)}
function parseModelJSON(text,fallback){if(!text)return fallback;try{return JSON.parse(text)}catch{}const match=String(text).match(/\{[\s\S]*\}/);if(match){try{return JSON.parse(match[0])}catch{}}return{...fallback,raw:String(text).slice(0,3000)}}
function textFromChat(data){const content=data?.choices?.[0]?.message?.content;if(typeof content==='string')return content;if(Array.isArray(content))return content.map(x=>x.text||'').join('\n');return''}
function imageUrlFromResponse(data){return data?.data?.[0]?.url||data?.output?.choices?.[0]?.message?.content?.find?.(x=>x.image)?.image||data?.output?.results?.[0]?.url||null}
function normalizeImageMeta(value){const width=Number(value?.original_width),height=Number(value?.original_height),ratio=Number(value?.aspect_ratio)||(width>0&&height>0?width/height:1);if(!(width>0&&height>0&&ratio>0))throw new Error('缺少空间原图 original_width / original_height / aspect_ratio');return{...value,original_width:Math.round(width),original_height:Math.round(height),aspect_ratio:ratio}}
function normalizedTarget(value,meta){const xRatio=Number.isFinite(Number(value?.x_ratio))?Number(value.x_ratio):Number(value?.x)/100,yRatio=Number.isFinite(Number(value?.y_ratio))?Number(value.y_ratio):Number(value?.y)/100;if(!Number.isFinite(xRatio)||!Number.isFinite(yRatio))throw new Error('缺少有效点选位置');const x_ratio=Math.min(1,Math.max(0,xRatio)),y_ratio=Math.min(1,Math.max(0,yRatio));return{x:Math.round(x_ratio*100),y:Math.round(y_ratio*100),x_ratio,y_ratio,original_x_px:Math.round(x_ratio*meta.original_width),original_y_px:Math.round(y_ratio*meta.original_height)}}
function chooseOutputSize(meta){const sourceRatio=meta.aspect_ratio,ratio=Math.min(8,Math.max(1/8,sourceRatio)),targetArea=1536*1024;let width=Math.sqrt(targetArea*ratio),height=Math.sqrt(targetArea/ratio);const maxSide=Math.max(width,height);if(maxSide>2048){const scale=2048/maxSide;width*=scale;height*=scale}const round16=value=>Math.max(16,Math.round(value/16)*16);width=round16(width);height=round16(height);return{width,height,original_width:width,original_height:height,size:`${width}*${height}`,aspect_ratio:width/height,source_aspect_ratio:sourceRatio,source_kind:'generated-original',framing_mode:sourceRatio<1/8||sourceRatio>8?'letterbox-no-crop':'full-frame-aspect-preserved'}}

function dashRoot(env){
  return (env.DASHSCOPE_BASE_URL||'https://dashscope.aliyuncs.com').replace(/\/compatible-mode\/v1\/?$/,'').replace(/\/$/,'');
}

async function dashFetch(env,path,body){
  if(!env.DASHSCOPE_API_KEY)throw new Error('服务端缺少 DASHSCOPE_API_KEY');
  const endpoint=dashRoot(env)+path;
  const response=await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${env.DASHSCOPE_API_KEY}`,'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  const requestId=response.headers.get('x-request-id')||data?.request_id||data?.output?.request_id||null;
  if(!response.ok){
    const reason=data?.error?.message||data?.message||data?.code||`HTTP ${response.status}`;
    throw new Error(`百炼接口 ${response.status}：${reason}${requestId?`（request_id: ${requestId}）`:''}`);
  }
  return{data,requestId,endpoint};
}

async function submitImageTask(env,body){
  if(!env.DASHSCOPE_API_KEY)throw new Error('服务端缺少 DASHSCOPE_API_KEY');
  const endpoint=dashRoot(env)+'/api/v1/services/aigc/image-generation/generation';
  const response=await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${env.DASHSCOPE_API_KEY}`,'content-type':'application/json','X-DashScope-Async':'enable'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  const requestId=response.headers.get('x-request-id')||data?.request_id||data?.output?.request_id||null;
  if(!response.ok){const reason=data?.message||data?.code||`HTTP ${response.status}`;throw new Error(`百炼异步任务提交失败 ${response.status}：${reason}${requestId?`（request_id: ${requestId}）`:''}`)}
  const taskId=data?.output?.task_id;if(!taskId)throw new Error(`百炼未返回异步任务 ID${requestId?`（request_id: ${requestId}）`:''}`);
  return{taskId,requestId,taskStatus:data?.output?.task_status||'PENDING'};
}

async function pollImageTask(env,taskId){
  if(!env.DASHSCOPE_API_KEY)throw new Error('服务端缺少 DASHSCOPE_API_KEY');
  if(!/^[a-zA-Z0-9_-]{8,128}$/.test(String(taskId||'')))throw new Error('无效的百炼任务 ID');
  const endpoint=dashRoot(env)+'/api/v1/tasks/'+encodeURIComponent(taskId);
  const response=await fetch(endpoint,{headers:{authorization:`Bearer ${env.DASHSCOPE_API_KEY}`}});
  const data=await response.json().catch(()=>({}));
  const requestId=response.headers.get('x-request-id')||data?.request_id||data?.output?.request_id||null;
  if(!response.ok){const reason=data?.message||data?.code||`HTTP ${response.status}`;throw new Error(`百炼任务查询失败 ${response.status}：${reason}${requestId?`（request_id: ${requestId}）`:''}`)}
  const taskStatus=data?.output?.task_status||'UNKNOWN',resultUrl=imageUrlFromResponse(data);
  const failure=data?.output?.message||data?.message||data?.code||null;
  return{taskId,taskStatus,resultUrl,requestId,failure};
}

async function analyzeScene(env,input){
  const promptConfig=promptSnapshot(input);
  const dims=input.dimensions||{},sizeText=dims.length||dims.width||dims.height?`Known real dimensions in cm: L=${dims.length||'unknown'}, W=${dims.width||'unknown'}, H=${dims.height||'unknown'}. Treat supplied values as hard constraints.`:'No dimensions supplied. Infer a conservative category-appropriate size from scene depth and nearby architectural references.';
  const requestText=`管理员 Prompt：${promptConfig.prompts.round0}

Analyze the complete, uncropped base scene for a localized furniture edit. Original image metadata=${JSON.stringify(input.imageMeta)}. Parse operation=${input.operation}, base image id=${input.baseImageId||'unknown'}, product reference, target normalized point x_ratio=${input.target.x_ratio}, y_ratio=${input.target.y_ratio} (original pixel x=${input.target.original_x_px}, y=${input.target.original_y_px}), user instruction, dimensions, point/text conflict resolution=${input.positionResolution||'none'}, and placement correction=${input.placementResolution||'none'}. The point denotes the bottom-center contact point. User instruction: ${input.instruction}. ${sizeText}
Return JSON only with: parsed_operation, parsed_base_image_id, parsed_target, parsed_instruction, parsed_dimensions, conflict_status, scene_type, support_surface, floor_or_surface_polygon, horizon_y_percent, vanishing_direction, camera_view, depth_at_target, light_direction, light_softness, color_temperature, nearby_scale_references, obstacles, occlusion_rules, recommended_orientation, estimated_dimensions_cm, placement_safety, warnings. Do not redesign the room.`;
  const response=await dashFetch(env,'/compatible-mode/v1/chat/completions',{model:env.VISION_MODEL||'qwen3-vl-plus',temperature:0.1,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a geometric scene analyst for photorealistic localized image editing. Return strict JSON.'},{role:'user',content:[{type:'image_url',image_url:{url:input.roomImage}},{type:'text',text:requestText}]}]});
  return{analysis:parseModelJSON(textFromChat(response.data),{support_surface:'unknown',depth_at_target:'unknown',placement_safety:'review',warnings:['scene analysis JSON parse fallback']}),requestId:response.requestId,prompt:requestText,promptConfig};
}

function taskContext(input,analysis){
  const d=input.dimensions||{},dimensionText=d.length||d.width||d.height?`Use real dimensions exactly as constraints: length ${d.length||'unspecified'} cm, width ${d.width||'unspecified'} cm, height ${d.height||'unspecified'} cm.`:`No dimensions were supplied. Use the scene analysis and common product-category dimensions; prefer a believable conservative scale over an oversized object.`;
  const positionRule=input.positionResolution||'点选位置与文字描述无明显冲突。',placementRule=input.placementResolution||'未触发额外落点纠错。';
  const output=chooseOutputSize(input.imageMeta);return `操作类型：${input.operation}\n用户要求：${input.instruction}\n原始基础图：${input.imageMeta.original_width}×${input.imageMeta.original_height}，aspect_ratio=${input.imageMeta.aspect_ratio}。必须保留从左、右、上、下边缘到边缘的完整构图。\n目标落点为归一化坐标 x_ratio=${input.target.x_ratio}, y_ratio=${input.target.y_ratio}，映射到原图像素 (${input.target.original_x_px}, ${input.target.original_y_px})，表示物体底部中心接触点。\n输出尺寸策略：${output.size}，${output.framing_mode}；禁止裁切，若比例受接口限制则用 padding / letterbox 保留全部画面。\n位置冲突处理：${positionRule}\n落点纠错处理：${placementRule}\n${dimensionText}\n场景分析 JSON：${JSON.stringify(analysis)}`;
}

function buildStagePrompt(stage,input,analysis,correction=''){
  const promptConfig=promptSnapshot(input),template=stage==='base'?promptConfig.prompts.round1:promptConfig.prompts.round2;
  const imageRoles=stage==='base'?'Image 1 是不可变的基础房间图和主编辑画布；Image 2 是商品外观参考。':'Image 1 是上一轮中间结果和本轮主编辑画布；Image 2 是商品外观参考；Image 3 是原始基础房间图，仅用于锁定未编辑背景、结构、机位和构图。';
  const retryRule=stage==='retry'?`\n\n唯一一次纠错约束\n${DEFAULT_PROMPTS.retry}`:'';
  return `${EDIT_SYSTEM}\n\n${imageRoles}\n\n管理员 Prompt\n${template}${retryRule}\n\n结构化上下文\n${taskContext(input,analysis)}${correction?`\n\n质量检查纠错要求\n${correction}`:''}`;
}

async function generateStage(env,stage,input,analysis,previousUrl=null,correction=''){
  const content=stage==='base'?[{image:input.roomImage},{image:input.productImage}]:[{image:previousUrl},{image:input.productImage},{image:input.roomImage}];
  const prompt=buildStagePrompt(stage,input,analysis,correction),outputMeta=chooseOutputSize(input.imageMeta);content.push({text:prompt});
  const response=await dashFetch(env,'/api/v1/services/aigc/multimodal-generation/generation',{model:env.IMAGE_EDIT_MODEL||'qwen-image-3.0',input:{messages:[{role:'user',content}]},parameters:{size:outputMeta.size,n:1,prompt_extend:true,watermark:false}});
  const url=imageUrlFromResponse(response.data);if(!url)throw new Error(`图像编辑模型未返回图片地址${response.requestId?`（request_id: ${response.requestId}）`:''}`);return{url,requestId:response.requestId,prompt,outputMeta};
}

async function submitGenerateStage(env,stage,input,analysis,previousUrl=null,correction=''){
  const content=stage==='base'?[{image:input.roomImage},{image:input.productImage}]:[{image:previousUrl},{image:input.productImage},{image:input.roomImage}];
  const prompt=buildStagePrompt(stage,input,analysis,correction),outputMeta=chooseOutputSize(input.imageMeta);content.push({text:prompt});
  const response=await submitImageTask(env,{model:env.IMAGE_EDIT_MODEL||'qwen-image-3.0',input:{messages:[{role:'user',content}]},parameters:{size:outputMeta.size,n:1,prompt_extend:true,watermark:false}});
  return{...response,prompt,outputMeta};
}

async function inspectQuality(env,input,analysis,resultUrl){
  const promptConfig=promptSnapshot(input),prompt=`管理员 Prompt：${promptConfig.prompts.round3}

你是家居 AI 图片质量检查助手。比较基础房间图、商品参考图、最终生成图、用户要求和结构化任务。目标底部中心为 x=${input.target.x}%, y=${input.target.y}%。场景分析：${JSON.stringify(analysis)}。
Return strict JSON with: pass(boolean), overall_score(0-100), collage_artifact_score(0-100 where 100 is fully natural), scale_score, perspective_score, grounding_score, shadow_lighting_score, product_similarity_score, background_preservation_score, object_penetration(boolean), incorrect_occlusion(boolean), floating_objects(boolean), missing_preserved_objects(boolean), background_drift(boolean), floating(boolean), severe_occlusion_error(boolean), background_damage(boolean), issues(array of short Chinese strings), correction_prompt(string).
逐项检查：
1. object_penetration：新增/替换家具是否与墙、地面、已有家具或小物品发生穿模；
2. incorrect_occlusion：前后深度与遮挡关系是否错误；
3. floating_objects：家具或应保留的小物品是否悬空、下沉或接触面不合理；
4. missing_preserved_objects：REPLACE 是否误删指定家具之外的物体，尤其是原家具上方或附近原本可以合理保留的独立小物品；
5. background_drift：编辑区域外的墙面/地面纹理、曝光、颗粒、清晰度、对比度、饱和度或色温是否相对基础图发生明显变化，是否出现磨皮、柔光、美化、降噪或全局调色。
同时检查用户要求、商品一致性、位置、比例、透视、局部阴影和场景融合。任何一项出现明显问题时 pass 必须为 false，并在 correction_prompt 中要求仅做必要的局部修复、从基础图恢复未编辑背景；不得通过全局重绘修复。若无明显问题输出 PASS。不要因为轻微压缩差异或轻微审美差异判定失败。`;
  const response=await dashFetch(env,'/compatible-mode/v1/chat/completions',{model:env.VISION_MODEL||'qwen3-vl-plus',temperature:0.1,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a strict visual QA inspector for scene-aware image editing. Return JSON only.'},{role:'user',content:[{type:'image_url',image_url:{url:input.roomImage}},{type:'image_url',image_url:{url:input.productImage}},{type:'image_url',image_url:{url:resultUrl}},{type:'text',text:prompt}]}]});
  const qc=parseModelJSON(textFromChat(response.data),{pass:false,overall_score:0,issues:['QC 响应无法解析'],correction_prompt:'Rebuild the object as part of the scene and preserve the base room.'});
  const blockingChecks=['object_penetration','incorrect_occlusion','floating_objects','missing_preserved_objects','background_drift'];
  const detected=blockingChecks.filter(key=>qc[key]===true);
  qc.pass=qc.pass===true&&detected.length===0;
  if(detected.length&&!qc.correction_prompt)qc.correction_prompt=`仅局部修正以下失败项：${detected.join(', ')}。以原始基础房间图恢复非编辑区域；禁止全局重绘、美化、柔光或调色。`;
  return{qc,requestId:response.requestId,prompt,promptConfig};
}

async function runPipeline(env,input){
  const rounds=[];
  let started=Date.now();
  const analysisResponse=await analyzeScene(env,input),analysis=analysisResponse.analysis;
  let timing=stageTiming(started);
  rounds.push({name:'Round 0 需求解析',state:'ANALYZED',description:'解析操作类型、基础图、商品图、点选位置、文字指令、尺寸与冲突状态；本轮不生成图片。',input:'基础图 + 商品图 + 用户指令 + 点选位置 + 尺寸 + 冲突状态',output:'scene-analysis.json',requestId:analysisResponse.requestId,...timing,data:{request_id:analysisResponse.requestId,operation:input.operation,base_image_id:input.baseImageId,image_meta:input.imageMeta,target:input.target,instruction:input.instruction,dimensions:input.dimensions,conflict_status:input.positionResolution||'无明显冲突',...analysis},prompt:analysisResponse.prompt,prompt_version:analysisResponse.promptConfig.prompt_version,last_updated_at:analysisResponse.promptConfig.last_updated_at});

  started=Date.now();let editResponse=await generateStage(env,'base',input,analysis),resultUrl=editResponse.url;
  timing=stageTiming(started);rounds.push({name:'Round 1 基础生成',state:'GENERATED',description:'完成 ADD / REPLACE，优先确保商品外观、目标位置和房间结构正确。',input:'原始基础图 + 商品参考图 + 结构化任务',output:'round-1-base.png',requestId:editResponse.requestId,...timing,imageUrl:resultUrl,output_image_meta:editResponse.outputMeta,prompt:editResponse.prompt,prompt_version:promptSnapshot(input).prompt_version,last_updated_at:promptSnapshot(input).last_updated_at});

  started=Date.now();editResponse=await generateStage(env,'composite',input,analysis,resultUrl);resultUrl=editResponse.url;
  timing=stageTiming(started);const round2={name:'Round 2 综合修正',state:'GENERATED',description:'合并修正尺寸比例、透视、接地、遮挡、穿模、阴影、光照、色温与场景融合。',input:'Round 1 图 + 商品参考图 + 原始背景锁定图',output:'round-2-composite.png',requestId:editResponse.requestId,...timing,imageUrl:resultUrl,output_image_meta:editResponse.outputMeta,prompt:editResponse.prompt,prompt_version:promptSnapshot(input).prompt_version,last_updated_at:promptSnapshot(input).last_updated_at};rounds.push(round2);

  started=Date.now();let qcResponse=await inspectQuality(env,input,analysis,resultUrl),qc=qcResponse.qc;
  let qualityTiming=stageTiming(started),attempts=2,initialQc={request_id:qcResponse.requestId,...qc,...qualityTiming};
  if(!qc.pass){
    attempts=3;const correction=qc.correction_prompt||`修正：${(qc.issues||[]).join('；')}`;
    started=Date.now();editResponse=await generateStage(env,'retry',input,analysis,resultUrl,correction);resultUrl=editResponse.url;
    const retryTiming=stageTiming(started),initialRound2={request_id:round2.requestId,start_time:round2.start_time,end_time:round2.end_time,duration:round2.duration,prompt:round2.prompt};Object.assign(round2,{state:'CORRECTED',description:'综合修正后首次质检未通过，已执行唯一一次局部纠错；后台仍只保留 Round 2 的最终图。',imageUrl:resultUrl,requestId:editResponse.requestId,prompt:editResponse.prompt,start_time:initialRound2.start_time,end_time:retryTiming.end_time,duration:initialRound2.duration+retryTiming.duration,durationMs:initialRound2.duration+retryTiming.duration,data:{initial_attempt:initialRound2,correction_attempt:{request_id:editResponse.requestId,...retryTiming,prompt:editResponse.prompt}}});
    started=Date.now();qcResponse=await inspectQuality(env,input,analysis,resultUrl);qc=qcResponse.qc;
    const finalCheckTiming=stageTiming(started);qualityTiming={start_time:initialQc.start_time,end_time:finalCheckTiming.end_time,duration:initialQc.duration+finalCheckTiming.duration,durationMs:initialQc.duration+finalCheckTiming.duration};
  }
  rounds.push({name:'Round 3 质量检查',state:qc.pass?'PASS':'FAIL',description:'比较基础图、商品图、用户要求和 Round 2 结果；若首次 FAIL，仅允许一次自动纠错与复检。',input:'原始图 + 商品图 + Round 2 图',output:'qc-final.json',requestId:qcResponse.requestId,...qualityTiming,data:{request_id:qcResponse.requestId,...qc,initial_check:initialQc,retry_used:attempts===3},prompt:qcResponse.prompt,prompt_version:qcResponse.promptConfig.prompt_version,last_updated_at:qcResponse.promptConfig.last_updated_at});
  return{resultUrl,analysis,qc,attempts,rounds,requestIds:rounds.map(r=>r.requestId).filter(Boolean),models:{analysis:env.VISION_MODEL||'qwen3-vl-plus',editing:env.IMAGE_EDIT_MODEL||'qwen-image-3.0',quality:env.VISION_MODEL||'qwen3-vl-plus'}};
}

function validatePipelineInput(input){
  assertImageInput(input.roomImage,'空间图');
  assertImageInput(input.productImage,'商品图');
  input.imageMeta=normalizeImageMeta(input.imageMeta);
  input.target=normalizedTarget(input.target,input.imageMeta);
  input.operation=input.operation==='REPLACE'?'REPLACE':'ADD';
  input.instruction=String(input.instruction||'').slice(0,1600);
  if(!input.instruction)throw new Error('缺少生图指令');
  return input;
}

async function runPipelineStage(env,input){
  if(input.action==='poll-image')return await pollImageTask(env,input.taskId);
  validatePipelineInput(input);
  const action=String(input.action||'');
  let started=Date.now();
  if(action==='analyze'){
    const response=await analyzeScene(env,input),analysis=response.analysis;
    return{analysis,round:{name:'Round 0 需求解析',state:'ANALYZED',description:'解析操作类型、基础图、商品图、点选位置、文字指令、尺寸与冲突状态；本轮不生成图片。',input:'基础图 + 商品图 + 用户指令 + 点选位置 + 尺寸 + 冲突状态',output:'scene-analysis.json',requestId:response.requestId,...stageTiming(started),data:{request_id:response.requestId,operation:input.operation,base_image_id:input.baseImageId,image_meta:input.imageMeta,target:input.target,instruction:input.instruction,dimensions:input.dimensions,conflict_status:input.positionResolution||'无明显冲突',...analysis},prompt:response.prompt,prompt_version:response.promptConfig.prompt_version,last_updated_at:response.promptConfig.last_updated_at}};
  }
  const analysis=input.analysis;
  if(!analysis||typeof analysis!=='object')throw new Error('缺少空间分析结果，请从需求解析阶段重新开始');
  if(['base','composite','retry'].includes(action)){
    if(action!=='base'&&!input.previousUrl)throw new Error('缺少上一轮图片，无法继续本轮优化');
    const response=await submitGenerateStage(env,action,input,analysis,input.previousUrl||null,input.correction||'');
    const roundMeta={
      base:{name:'Round 1 基础生成',description:'完成 ADD / REPLACE，优先确保用户要求、商品外观和空间结构正确。',input:'原始基础图 + 商品参考图 + 结构化任务',output:'round-1-base.png'},
      composite:{name:'Round 2 综合修正',description:'合并修正尺寸、透视、接地、遮挡、穿模、阴影、光照、色温与场景融合。',input:'Round 1 图 + 商品参考图 + 原始背景锁定图',output:'round-2-composite.png'},
      retry:{name:'Round 2 综合修正',description:'首次质检未通过，执行唯一一次局部纠错，并覆盖 Round 2 的展示结果。',input:'Round 2 图 + 商品参考图 + 原始背景锁定图 + QC',output:'round-2-corrected.png'}
    }[action];
    const meta=promptSnapshot(input);return{taskId:response.taskId,taskStatus:response.taskStatus,round:{...roundMeta,state:'SUBMITTED',requestId:response.requestId,...stageTiming(started),taskId:response.taskId,output_image_meta:response.outputMeta,prompt:response.prompt,prompt_version:meta.prompt_version,last_updated_at:meta.last_updated_at}};
  }
  if(action==='quality'){
    if(!input.resultUrl)throw new Error('缺少待检查的生成图片');
    const response=await inspectQuality(env,input,analysis,input.resultUrl),qc=response.qc,isRetry=!!input.isRetry;
    return{qc,round:{name:'Round 3 质量检查',state:qc.pass?'PASS':isRetry?'FAIL':'RETRY',description:isRetry?'纠错后最终复检；不再继续自动生成。':'比较基础图、商品图、用户要求和 Round 2 结果，输出 PASS / FAIL 与问题说明。',input:'原始图 + 商品图 + Round 2 图',output:'qc-final.json',requestId:response.requestId,...stageTiming(started),data:{request_id:response.requestId,...qc,retry_check:isRetry},prompt:response.prompt,prompt_version:response.promptConfig.prompt_version,last_updated_at:response.promptConfig.last_updated_at}};
  }
  throw new Error('未知的生成阶段');
}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(request)});
    if(url.pathname==='/')return new Response(PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
    if(url.pathname==='/app.js')return new Response(APP_JS,{headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'}});
    if(url.pathname==='/assets/living-room.png')return assetResponse(ROOM_BYTES,'image/png');
    if(url.pathname==='/assets/caramel-chair.png')return assetResponse(PRODUCT_BYTES,'image/png');
    if(url.pathname==='/api/health')return json({ok:true,configured:!!env.DASHSCOPE_API_KEY,mode:'scene-aware-editing',endpointFamily:'dashscope-native-image-edit',models:{vision:env.VISION_MODEL||'qwen3-vl-plus',image:env.IMAGE_EDIT_MODEL||'qwen-image-3.0'}},200,request);
    if(url.pathname==='/api/generate-stage'&&request.method==='POST'){
      try{return json(await runPipelineStage(env,await request.json()),200,request)}catch(error){return json({error:error?.message||'本轮生成失败'},500,request)}
    }
    if(url.pathname==='/api/generate'&&request.method==='POST'){
      try{return json(await runPipeline(env,validatePipelineInput(await request.json())),200,request)}catch(error){return json({error:error?.message||'生成失败'},500,request)}
    }
    return new Response('Not found',{status:404});
  }
};
