import {describe,it,expect,beforeEach,afterEach} from 'vitest';
import {createServer} from '../src/server';
import type {Plugin} from '@upp/sdk';
const stub:Plugin={id:'demo',name:'Demo',description:'Demo',version:'1',operations:['ping'],async start(){},async stop(){},async execute(){return {pong:true}}};
describe('API',()=>{
 const oldKey=process.env.ADMIN_API_KEY;
 beforeEach(()=>{process.env.ADMIN_API_KEY='rust-eze-test-key';});
 afterEach(()=>{if(oldKey===undefined)delete process.env.ADMIN_API_KEY;else process.env.ADMIN_API_KEY=oldKey;});
 it('lists plugins and runs operations',async()=>{const {app}=await createServer({plugins:[stub]});try{const list=await app.inject({method:'GET',url:'/api/plugins',headers:{'x-api-key':'rust-eze-test-key'}});expect(list.statusCode).toBe(200);expect(list.json().plugins[0].state).toBe('running');const result=await app.inject({method:'POST',url:'/api/execute',headers:{'x-api-key':'rust-eze-test-key'},payload:{pluginId:'demo',operation:'ping'}});expect(result.json().result).toEqual({pong:true});}finally{await app.close();}});
 it('validates execution payloads',async()=>{const {app}=await createServer({plugins:[stub]});try{const response=await app.inject({method:'POST',url:'/api/execute',headers:{'x-api-key':'rust-eze-test-key'},payload:{bad:true}});expect(response.statusCode).toBe(400);}finally{await app.close();}});
});
