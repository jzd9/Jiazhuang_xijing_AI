import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const [template,page,app,room,product]=await Promise.all([
  readFile(new URL('worker/index.js',root),'utf8'),
  readFile(new URL('dist/index.html',root),'utf8'),
  readFile(new URL('dist/app.js',root),'utf8'),
  readFile(new URL('dist/assets/living-room.png',root)),
  readFile(new URL('dist/assets/caramel-chair.png',root))
]);
const output=template
  .replace('__PAGE__',()=>JSON.stringify(page))
  .replace('__APP_JS__',()=>JSON.stringify(app))
  .replace('__ROOM_BYTES__',()=>JSON.stringify(room.toString('base64')))
  .replace('__PRODUCT_BYTES__',()=>JSON.stringify(product.toString('base64')));
await mkdir(new URL('dist/server/',root),{recursive:true});
await writeFile(new URL('dist/server/index.js',root),output);
console.log(`Built dist/server/index.js (${Math.round(output.length/1024)} KB)`);
