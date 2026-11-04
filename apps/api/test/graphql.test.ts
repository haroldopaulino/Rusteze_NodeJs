import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from '../src/server';
import type { Plugin } from '@upp/sdk';
const mock: Plugin={id:'demo',name:'Demo Plugin',description:'GraphQL testing',version:'1',operations:['ping'],async start(){},async stop(){},async execute(){return {pong:true}}};
describe('GraphQL SDK endpoint',()=>{
 const original=process.env.ADMIN_API_KEY;
 beforeEach(()=>{process.env.ADMIN_API_KEY='graphql-test-key';});
 afterEach(()=>{if(original===undefined)delete process.env.ADMIN_API_KEY;else process.env.ADMIN_API_KEY=original;});
 it('requires the same API key as REST',async()=>{const {app}=await createServer({plugins:[mock]});try{const res=await app.inject({method:'POST',url:'/graphql',payload:{query:'{ plugins { id } }'}});expect(res.statusCode).toBe(401);}finally{await app.close();}});
 it('queries registry and executes through the SDK',async()=>{const {app}=await createServer({plugins:[mock]});try{
 const headers={'x-api-key':'graphql-test-key'};
 const a=await app.inject({method:'POST',url:'/graphql',headers,payload:{query:'{ plugins { id state operations } }'}});
 expect(a.statusCode).toBe(200);expect(a.json().data.plugins[0]).toMatchObject({id:'demo',state:'running'});
 const b=await app.inject({method:'POST',url:'/graphql',headers,payload:{query:'query { executePlugin(pluginId:"demo",operation:"ping",input:{}) }'}});
 expect(b.json().data.executePlugin).toEqual({pong:true});
 }finally{await app.close();}});
 it('supports lifecycle mutations and rejects invalid GraphQL',async()=>{const {app}=await createServer({plugins:[mock]});try{const headers={'x-api-key':'graphql-test-key'};
 const a=await app.inject({method:'POST',url:'/graphql',headers,payload:{query:'mutation { disablePlugin(id:"demo") { state } }'}});
 expect(a.json().data.disablePlugin.state).toBe('stopped');
 const b=await app.inject({method:'POST',url:'/graphql',headers,payload:{query:'mutation { enablePlugin(id:"demo") { state } }'}});
 expect(b.json().data.enablePlugin.state).toBe('running');
 const invalid=await app.inject({method:'POST',url:'/graphql',headers,payload:{query:'{ notAField }'}});
 expect(invalid.statusCode).toBe(400);expect(invalid.json().errors.length).toBeGreaterThan(0);
 }finally{await app.close();}});
});
