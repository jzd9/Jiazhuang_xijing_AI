const PAGE = __PAGE__;
const APP_JS = __APP_JS__;
const ROOM_BYTES = __ROOM_BYTES__;
const PRODUCT_BYTES = __PRODUCT_BYTES__;

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const EDIT_SYSTEM=`You are a production-grade scene-aware interior image editor, not a compositor.
Perform localized image editing / inpainting around the requested placement region. Re-render the inserted object as part of the photographed 3D scene.
Hard constraints:
- preserve room structure, camera angle, lens perspective, vanishing directions and framing;
- preserve all unedited walls, floors, ceilings, doors, windows, fixtures and objects;
- match the product reference's shape, color, material, construction and distinctive design details;
- insert the furniture naturally at the requested normalized position and orientation;
- use realistic physical scale from supplied dimensions; otherwise infer category-appropriate scale from the floor plane, depth and nearby references;
- align the object to the supporting floor, wall, tabletop or shelf; no floating, sinking or wall penetration;
- match perspective foreshortening, occlusion ordering, ambient light direction, exposure and color temperature;
- create physically plausible contact shadows, soft cast shadows and subtle bounced light;
- output one photorealistic interior photograph, not a collage, sticker, cutout, mockup, product-page overlay or transparent layer;
- do not copy product-page text, price tags, UI, background, watermark or surrounding props into the room.
Change only what the instruction requires.`;

const ROUND_PROMPTS={
  base:`你是一个真实家居空间图片编辑模型。根据基础房间图片、家具商品参考图、结构化任务和用户要求完成第一次图片编辑。保持基础图片的空间结构、拍摄角度、构图和透视关系；仅修改指定对象或区域；严格参考商品外形、颜色、材质、结构和关键设计细节。ADD 不删除原有家具，REPLACE 只替换指定家具。根据透视和尺寸调整大小与角度，使商品与支撑面自然接触。输出真实室内摄影预览，不要重新设计整个房间。优先级：完成用户要求 > 商品保真 > 空间保真 > 视觉自然。`,
  geometry:`检查上一轮效果图中的空间与几何关系，只修正必要问题：家具尺寸、透视、接地、悬空、穿模、结构扭曲、前后遮挡和用户指定位置。除非为修复这些问题，不得重新设计商品或修改房间背景；不得改变房间布局、门窗、墙地面、未编辑家具及商品设计特征。目标是提高空间真实性，不是生成新的装修方案。`,
  lighting:`在不改变商品位置、尺寸、结构和房间布局的情况下，提高商品与真实房间的视觉融合。仅优化光照方向与强度、色温、接触阴影与投影、环境反射、色彩一致性、必要的清晰度与边缘融合。不得增加家具或装饰，不得改变未指定区域，不得重新设计商品。最终图应像商品真实放在原房间中拍摄。`,
  retry:`根据质量检查指出的问题，对上一轮结果做一次局部纠错。只处理明确失败项，保持已经正确的商品外观、位置、房间结构和未编辑区域。不得借机重做房间或改变商品款式。`
};

function corsHeaders(request){const origin=request.headers.get('origin')||'*';return{"access-control-allow-origin":origin,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","vary":"origin"}}
function json(data,status=200,request){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...corsHeaders(request)}})}
function assetResponse(base64,type){const raw=atob(base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Response(bytes,{headers:{"content-type":type,"cache-control":"public, max-age=86400"}})}
function assertDataImage(value,name){if(typeof value!=='string'||!/^data:image\/(png|jpeg|webp);base64,/i.test(value))throw new Error(`${name} 必须是 PNG/JPEG/WebP 图片`);if(value.length>14_000_000)throw new Error(`${name} 超过 10MB，请压缩后重试`)}
function parseModelJSON(text,fallback){if(!text)return fallback;try{return JSON.parse(text)}catch{}const match=String(text).match(/\{[\s\S]*\}/);if(match){try{return JSON.parse(match[0])}catch{}}return{...fallback,raw:String(text).slice(0,3000)}}
function textFromChat(data){const content=data?.choices?.[0]?.message?.content;if(typeof content==='string')return content;if(Array.isArray(content))return content.map(x=>x.text||'').join('\n');return''}
function imageUrlFromResponse(data){return data?.data?.[0]?.url||data?.output?.choices?.[0]?.message?.content?.find?.(x=>x.image)?.image||data?.output?.results?.[0]?.url||null}

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

async function analyzeScene(env,input){
  const dims=input.dimensions||{},sizeText=dims.length||dims.width||dims.height?`Known real dimensions in cm: L=${dims.length||'unknown'}, W=${dims.width||'unknown'}, H=${dims.height||'unknown'}. Treat supplied values as hard constraints.`:'No dimensions supplied. Infer a conservative category-appropriate size from scene depth and nearby architectural references.';
  const requestText=`Analyze the base scene for a localized furniture edit. Target point is normalized image coordinate x=${input.target.x}%, y=${input.target.y}% and denotes the bottom-center contact point. Operation=${input.operation}. User instruction: ${input.instruction}. ${sizeText}
Return JSON only with: scene_type, support_surface, floor_or_surface_polygon, horizon_y_percent, vanishing_direction, camera_view, depth_at_target, light_direction, light_softness, color_temperature, nearby_scale_references, obstacles, occlusion_rules, recommended_orientation, estimated_dimensions_cm, placement_safety, warnings. Do not redesign the room.`;
  const response=await dashFetch(env,'/compatible-mode/v1/chat/completions',{model:env.VISION_MODEL||'qwen3-vl-plus',temperature:0.1,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a geometric scene analyst for photorealistic localized image editing. Return strict JSON.'},{role:'user',content:[{type:'image_url',image_url:{url:input.roomImage}},{type:'text',text:requestText}]}]});
  return{analysis:parseModelJSON(textFromChat(response.data),{support_surface:'unknown',depth_at_target:'unknown',placement_safety:'review',warnings:['scene analysis JSON parse fallback']}),requestId:response.requestId};
}

function taskContext(input,analysis){
  const d=input.dimensions||{},dimensionText=d.length||d.width||d.height?`Use real dimensions exactly as constraints: length ${d.length||'unspecified'} cm, width ${d.width||'unspecified'} cm, height ${d.height||'unspecified'} cm.`:`No dimensions were supplied. Use the scene analysis and common product-category dimensions; prefer a believable conservative scale over an oversized object.`;
  return `操作类型：${input.operation}\n用户要求：${input.instruction}\n目标落点为图像归一化坐标 x=${input.target.x}%, y=${input.target.y}%，表示物体底部中心接触点。${dimensionText}\n场景分析 JSON：${JSON.stringify(analysis)}`;
}

function buildStagePrompt(stage,input,analysis,correction=''){
  const imageRoles=stage==='base'?'Image 1 是不可变的基础房间图和主编辑画布；Image 2 是商品外观参考。':'Image 1 是上一轮中间结果和本轮主编辑画布；Image 2 是商品外观参考；Image 3 是原始基础房间图，仅用于锁定未编辑背景、结构、机位和构图。';
  return `${EDIT_SYSTEM}\n\n${imageRoles}\n\n${ROUND_PROMPTS[stage]}\n\n结构化上下文\n${taskContext(input,analysis)}${correction?`\n\n质量检查纠错要求\n${correction}`:''}`;
}

async function generateStage(env,stage,input,analysis,previousUrl=null,correction=''){
  const content=stage==='base'?[{image:input.roomImage},{image:input.productImage}]:[{image:previousUrl},{image:input.productImage},{image:input.roomImage}];
  const prompt=buildStagePrompt(stage,input,analysis,correction);content.push({text:prompt});
  const response=await dashFetch(env,'/api/v1/services/aigc/multimodal-generation/generation',{model:env.IMAGE_EDIT_MODEL||'qwen-image-3.0',input:{messages:[{role:'user',content}]},parameters:{size:'1536*1024',n:1,prompt_extend:true,watermark:false}});
  const url=imageUrlFromResponse(response.data);if(!url)throw new Error(`图像编辑模型未返回图片地址${response.requestId?`（request_id: ${response.requestId}）`:''}`);return{url,requestId:response.requestId,prompt};
}

async function inspectQuality(env,input,analysis,resultUrl){
  const prompt=`你是家居 AI 图片质量检查助手。比较基础房间图、商品参考图、最终生成图、用户要求和结构化任务。目标底部中心为 x=${input.target.x}%, y=${input.target.y}%。场景分析：${JSON.stringify(analysis)}。
Return strict JSON with: pass(boolean), overall_score(0-100), collage_artifact_score(0-100 where 100 is fully natural), scale_score, perspective_score, grounding_score, shadow_lighting_score, product_similarity_score, background_preservation_score, floating(boolean), severe_occlusion_error(boolean), background_damage(boolean), issues(array of short Chinese strings), correction_prompt(string).
检查用户要求、商品一致性、位置、比例、透视、悬空/穿模/结构异常、背景误改和光影。若无明显问题输出 PASS；若有明显问题输出 FAIL，并指出最需修正的 1–3 项。不要因为轻微审美差异判定失败。`;
  const response=await dashFetch(env,'/compatible-mode/v1/chat/completions',{model:env.VISION_MODEL||'qwen3-vl-plus',temperature:0.1,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a strict visual QA inspector for scene-aware image editing. Return JSON only.'},{role:'user',content:[{type:'image_url',image_url:{url:input.roomImage}},{type:'image_url',image_url:{url:input.productImage}},{type:'image_url',image_url:{url:resultUrl}},{type:'text',text:prompt}]}]});
  const qc=parseModelJSON(textFromChat(response.data),{pass:false,overall_score:0,issues:['QC 响应无法解析'],correction_prompt:'Rebuild the object as part of the scene and preserve the base room.'});qc.pass=qc.pass===true;return{qc,requestId:response.requestId};
}

async function runPipeline(env,input){
  const rounds=[];
  let started=Date.now();
  const analysisResponse=await analyzeScene(env,input),analysis=analysisResponse.analysis;
  rounds.push({name:'Round 0 需求解析',state:'ANALYZED',description:'把用户输入转为结构化任务，并识别支撑面、纵深、透视、光线、遮挡与尺度参照。',input:'基础图 + 商品图 + 用户指令 + 点选位置 + 尺寸',output:'scene-analysis.json',requestId:analysisResponse.requestId,durationMs:Date.now()-started,data:{request_id:analysisResponse.requestId,...analysis},prompt:'PRD Round 0：需求解析与空间理解；本轮不生成图片。'});

  started=Date.now();let editResponse=await generateStage(env,'base',input,analysis),resultUrl=editResponse.url;
  rounds.push({name:'Round 1 基础生成',state:'GENERATED',description:'完成 ADD / REPLACE，优先确保用户要求、商品外观和空间结构正确。',input:'原始基础图 + 商品参考图 + 结构化任务',output:'round-1-base.png',requestId:editResponse.requestId,durationMs:Date.now()-started,imageUrl:resultUrl,prompt:editResponse.prompt});

  started=Date.now();editResponse=await generateStage(env,'geometry',input,analysis,resultUrl);resultUrl=editResponse.url;
  rounds.push({name:'Round 2 几何修正',state:'GENERATED',description:'基于上一轮真实图片，修正尺寸、透视、接地、遮挡、悬空和穿模。',input:'Round 1 图 + 商品参考图 + 原始背景锁定图',output:'round-2-geometry.png',requestId:editResponse.requestId,durationMs:Date.now()-started,imageUrl:resultUrl,prompt:editResponse.prompt});

  started=Date.now();editResponse=await generateStage(env,'lighting',input,analysis,resultUrl);resultUrl=editResponse.url;
  rounds.push({name:'Round 3 光影融合',state:'GENERATED',description:'基于几何修正图，只优化接触阴影、色温、环境光、反射和边缘融合。',input:'Round 2 图 + 商品参考图 + 原始背景锁定图',output:'round-3-lighting.png',requestId:editResponse.requestId,durationMs:Date.now()-started,imageUrl:resultUrl,prompt:editResponse.prompt});

  started=Date.now();let qcResponse=await inspectQuality(env,input,analysis,resultUrl),qc=qcResponse.qc;
  rounds.push({name:'Round 4 质量检查',state:qc.pass?'PASS':'RETRY',description:'比较基础图、商品图、用户要求和最终图，检查商品、位置、比例、透视、接地、背景与光影。',input:'原始图 + 商品图 + Round 3 图',output:'qc-final.json',requestId:qcResponse.requestId,durationMs:Date.now()-started,data:{request_id:qcResponse.requestId,...qc},prompt:'PRD Round 4：最终质量检查；只输出 PASS / FAIL 与最需修正的问题。'});
  let attempts=3;
  if(!qc.pass){
    attempts=4;const correction=qc.correction_prompt||`修正：${(qc.issues||[]).join('；')}`;
    started=Date.now();editResponse=await generateStage(env,'retry',input,analysis,resultUrl,correction);resultUrl=editResponse.url;
    rounds.push({name:'Round 5 自动纠错图',state:'GENERATED',description:'质量检查未通过，基于 Round 3 仅修复明确失败项；这是最多一次的自动纠错。',input:'Round 3 图 + 商品参考图 + 原始背景锁定图 + QC',output:'round-4-retry.png',requestId:editResponse.requestId,durationMs:Date.now()-started,imageUrl:resultUrl,prompt:editResponse.prompt});
    started=Date.now();qcResponse=await inspectQuality(env,input,analysis,resultUrl);qc=qcResponse.qc;
    rounds.push({name:'Round 6 纠错后质检',state:qc.pass?'PASS':'NEEDS_REVIEW',description:'对第 4 张后台生成图执行最终复检，不再继续自动生成。',input:'原始图 + 商品图 + 纠错图',output:'qc-retry.json',requestId:qcResponse.requestId,durationMs:Date.now()-started,data:{request_id:qcResponse.requestId,...qc},prompt:'最终复检：输出 PASS / FAIL 与遗留问题。'});
  }
  return{resultUrl,analysis,qc,attempts,rounds,requestIds:rounds.map(r=>r.requestId).filter(Boolean),models:{analysis:env.VISION_MODEL||'qwen3-vl-plus',editing:env.IMAGE_EDIT_MODEL||'qwen-image-3.0',quality:env.VISION_MODEL||'qwen3-vl-plus'}};
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
    if(url.pathname==='/api/generate'&&request.method==='POST'){
      try{const input=await request.json();assertDataImage(input.roomImage,'空间图');assertDataImage(input.productImage,'商品图');if(!input.target||!Number.isFinite(input.target.x)||!Number.isFinite(input.target.y))throw new Error('缺少有效点选位置');input.operation=input.operation==='REPLACE'?'REPLACE':'ADD';input.instruction=String(input.instruction||'').slice(0,1600);if(!input.instruction)throw new Error('缺少生图指令');return json(await runPipeline(env,input),200,request)}catch(error){return json({error:error?.message||'生成失败'},500,request)}
    }
    return new Response('Not found',{status:404});
  }
};
