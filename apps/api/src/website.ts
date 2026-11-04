import type {FastifyInstance} from 'fastify';
import {readFile} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const publicFiles: Record<string,string>={
 '/':'index.html', '/index.html':'index.html', '/app.js':'app.js',
 '/styles.css':'styles.css','/favicon.ico':'assets/favicon.svg',
 '/favicon.svg':'assets/favicon.svg'
};
const mime:Record<string,string>={
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp',
 '.ico':'image/x-icon','.json':'application/json; charset=utf-8'
};

export function registerWebsiteRoutes(app:FastifyInstance){
 app.get('/',async(_request,reply)=>send(reply,resolve(root,'index.html')));
 app.get('/index.html',async(_request,reply)=>send(reply,resolve(root,'index.html')));
 app.get('/app.js',async(_request,reply)=>send(reply,resolve(root,'app.js')));
 app.get('/date-format.js',async(_request,reply)=>send(reply,resolve(root,'date-format.js')));
 app.get('/styles.css',async(_request,reply)=>send(reply,resolve(root,'styles.css')));
 app.get('/graphql-playground.html',async(_request,reply)=>send(reply,resolve(root,'graphql-playground.html')));
 app.get('/graphql-playground.js',async(_request,reply)=>send(reply,resolve(root,'graphql-playground.js')));
 app.get('/graphql-playground.css',async(_request,reply)=>send(reply,resolve(root,'graphql-playground.css')));
 app.get('/postman-viewer.html',async(_request,reply)=>send(reply,resolve(root,'postman-viewer.html')));
 app.get('/postman-viewer.js',async(_request,reply)=>send(reply,resolve(root,'postman-viewer.js')));
 app.get('/postman-viewer.css',async(_request,reply)=>send(reply,resolve(root,'postman-viewer.css')));
 app.get('/README-web.html',async(_request,reply)=>send(reply,resolve(root,'README-web.html')));
 app.get('/postman/Rust-eze.postman_collection.json',async(_request,reply)=>send(reply,resolve(root,'postman/Rust-eze.postman_collection.json')));
 app.get('/postman/Rust-eze-HTTPS-8123.postman_environment.json',async(_request,reply)=>send(reply,resolve(root,'postman/Rust-eze-HTTPS-8123.postman_environment.json')));
 app.get('/favicon.svg',async(_request,reply)=>send(reply,resolve(root,'assets/favicon.svg')));
 app.get('/assets/*',async(request,reply)=>{
   const rel=(request.params as {'*':string})['*'];
   if(!/^[a-zA-Z0-9_-]+\.(svg|png|jpg|webp|ico)$/.test(rel))return reply.code(404).send({error:'Not found'});
   return send(reply,resolve(root,'assets',rel));
 });
 app.get('/dashboard',async(_request,reply)=>reply.redirect('/dashboard/'));
 app.get('/dashboard/',async(_request,reply)=>send(reply,resolve(root,'apps/dashboard/dist/index.html')));
 app.get('/dashboard/*',async(request,reply)=>{
   const rel=(request.params as {'*':string})['*'];
   if(!/^(?:assets\/)?[a-zA-Z0-9_.-]+\.(?:js|css|svg|png|jpg|webp|ico)$/.test(rel))return reply.code(404).send({error:'Not found'});
   return send(reply,resolve(root,'apps/dashboard/dist',rel));
 });
}
async function send(reply:import('fastify').FastifyReply,file:string){
 try{
   const body=await readFile(file);
   reply.header('Cache-Control','no-store');
   reply.type(mime[extname(file)]||'application/octet-stream');
   return reply.send(body);
 }catch(error){
   if((error as NodeJS.ErrnoException).code==='ENOENT')return reply.code(404).send({error:'Website file missing. Run npm run build.'});
   throw error;
 }
}
