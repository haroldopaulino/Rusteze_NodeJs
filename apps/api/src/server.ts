import Fastify from 'fastify';
import { readFileSync } from 'node:fs';
import cors from '@fastify/cors';
import { z } from 'zod';
import { PluginError, PluginRegistry, type Plugin } from '@upp/sdk';
import { MySqlPlugin } from '@upp/plugin-mysql';
import { StoragePlugin } from '@upp/plugin-storage';
import { NotificationsPlugin } from '@upp/plugin-notifications';
import { registerWebsiteRoutes } from './website.js';
import { registerGraphQLRoutes } from './graphql.js';

const executeSchema=z.object({pluginId:z.string(),operation:z.string(),input:z.record(z.unknown()).default({})});
export async function createServer(options: { plugins?: Plugin[]; bootstrap?: boolean } = {}) {
 const tlsCert=process.env.TLS_CERT_FILE?.trim();
 const tlsKey=process.env.TLS_KEY_FILE?.trim();
 const tlsChain=process.env.TLS_CHAIN_FILE?.trim();
 if(Boolean(tlsCert)!==Boolean(tlsKey)) throw new Error('TLS_CERT_FILE and TLS_KEY_FILE must both be set for HTTPS');
 if(tlsChain&&!tlsCert) throw new Error('TLS_CHAIN_FILE requires TLS_CERT_FILE and TLS_KEY_FILE');
 const https=tlsCert&&tlsKey?{
  cert:tlsChain?Buffer.concat([readFileSync(tlsCert),Buffer.from('\n'),readFileSync(tlsChain)]):readFileSync(tlsCert),
  key:readFileSync(tlsKey)
 }:undefined;
 const app=Fastify({logger:true,...(https?{https}:{})});
 await app.register(cors,{origin:(process.env.CORS_ORIGIN||'http://localhost:5173').split(',')});
 const registry=new PluginRegistry();
 for(const plugin of options.plugins||[new MySqlPlugin(),new StoragePlugin(),new NotificationsPlugin()]) registry.register(plugin);
 app.setErrorHandler((err,req,reply)=>{const code=err instanceof PluginError?err.statusCode:err instanceof z.ZodError?400:err.statusCode||500; req.log.error(err); reply.status(code).send({error:err.message});});
 app.get('/health',async()=>({status:'ok',timestamp:new Date().toISOString()}));
 registerWebsiteRoutes(app);
 registerGraphQLRoutes(app,registry);
 const admin=async(req: import('fastify').FastifyRequest,reply: import('fastify').FastifyReply)=>{const key=process.env.ADMIN_API_KEY; if(!key){reply.status(503).send({error:'ADMIN_API_KEY is not configured'});return;} if(req.headers['x-api-key']!==key){reply.status(401).send({error:'Missing or invalid X-API-Key'});}};
 app.get('/api/plugins',{preHandler:admin},async()=>({plugins:registry.list()}));
 app.get('/api/events',{preHandler:admin},async()=>({events:registry.events()}));
 app.post<{Params:{id:string}}>('/api/plugins/:id/enable',{preHandler:admin},async req=>({plugin:await registry.enable(req.params.id)}));
 app.post<{Params:{id:string}}>('/api/plugins/:id/disable',{preHandler:admin},async req=>({plugin:await registry.disable(req.params.id)}));
 app.post('/api/execute',{preHandler:admin},async req=>{const data=executeSchema.parse(req.body);return {result:await registry.execute(data.pluginId,data.operation,data.input)};});
 app.addHook('onClose',async()=>{await registry.shutdown();});
 if(options.bootstrap!==false){for(const item of registry.list()) {try{await registry.enable(item.id);}catch(error){app.log.warn({error,plugin:item.id},'Plugin unavailable; retry via enable endpoint');}}}
 return {app,registry};
}
