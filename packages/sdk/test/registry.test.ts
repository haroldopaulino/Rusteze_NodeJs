import {describe,it,expect,vi} from 'vitest';
import {PluginRegistry,type Plugin} from '../src/index';
const makePlugin=():Plugin=>({id:'demo',name:'Demo',description:'Test plugin',version:'1.0',operations:['ping'],start:vi.fn(async()=>{}),stop:vi.fn(async()=>{}),execute:vi.fn(async()=>({pong:true}))});
describe('PluginRegistry',()=>{
 it('registers and executes a running plugin',async()=>{const registry=new PluginRegistry();registry.register(makePlugin());await expect(registry.execute('demo','ping')).rejects.toThrow('not running');await registry.enable('demo');expect(await registry.execute('demo','ping')).toEqual({pong:true});await registry.disable('demo');expect(registry.list()[0].state).toBe('stopped');});
 it('blocks duplicate IDs and unsupported operations',async()=>{const registry=new PluginRegistry();registry.register(makePlugin());expect(()=>registry.register(makePlugin())).toThrow('Duplicate');await registry.enable('demo');await expect(registry.execute('demo','not-real')).rejects.toThrow('Unsupported');});
 it('records lifecycle events',async()=>{const registry=new PluginRegistry();registry.register(makePlugin());await registry.enable('demo');expect(registry.events().some(event=>event.type==='plugin.started')).toBe(true);});
});
