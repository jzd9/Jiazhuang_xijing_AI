import {readFile,stat} from 'node:fs/promises';
const file=new URL('../dist/server/index.js',import.meta.url),source=await readFile(file,'utf8'),info=await stat(file);
const failures=[];
if(!source.includes('export default'))failures.push('missing default export');
if(!source.includes("'/api/generate'"))failures.push('missing generate route');
if(source.includes('__PAGE__')||source.includes('__APP_JS__'))failures.push('unresolved build token');
if(!source.includes('const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>'))failures.push('client selector helpers were corrupted during embedding');
if(!source.includes("fetch('/api/generate'"))failures.push('client does not call generate API');
if(!source.includes("if(!text)return toast('请先输入生图或调整要求')"))failures.push('missing required prompt validation');
if(!source.includes("if(!roomSrc)return toast('请先上传一张空间照片')"))failures.push('missing room-image validation');
if(!source.includes("if(!productSrc)return toast('请先上传商品参考图')"))failures.push('missing product-image validation');
if(!source.includes("if(!target)return toast('请先在空间照片上点选目标位置')"))failures.push('missing target validation');
if(!source.includes("URL.createObjectURL(blob)"))failures.push('missing result download flow');
if(!source.includes("qijing-ai-conversations-v2"))failures.push('missing persisted conversation history');
if(!source.includes("Round 3 光影融合"))failures.push('missing multi-round image pipeline');
if(info.size<100000)failures.push('embedded assets missing');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`Validated Worker artifact (${Math.round(info.size/1024)} KB)`);
