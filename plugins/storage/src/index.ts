import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { Plugin, PluginContext, JsonObject } from '@upp/sdk';
export class StoragePlugin implements Plugin {
 id='storage'; name='File Storage'; description='Write, list, and read UTF-8 files in an isolated directory'; version='1.0.0'; operations=['writeFile','listFiles','readFile'] as const;
 private directory = resolve(process.env.STORAGE_DIR || '.data/files');
 async start(context: PluginContext) { await mkdir(this.directory,{recursive:true}); context.log(`Storage initialized: ${this.directory}`); }
 async stop() {}
 private filename(input: JsonObject) { const name=input.name; if(typeof name!=='string'|| !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(name)||name==='..') throw new Error('Invalid filename'); return join(this.directory,name); }
 async execute(operation:string,input:JsonObject) {
   if(operation==='listFiles') return (await readdir(this.directory)).sort();
   if(operation==='writeFile') { const target=this.filename(input); if(typeof input.content!=='string'|| Buffer.byteLength(input.content)>65536) throw new Error('content must be text of at most 64 KiB'); await writeFile(target,input.content,'utf8'); return {name:input.name,bytes:Buffer.byteLength(input.content)}; }
   if(operation==='readFile') { const target=this.filename(input); return {name:input.name,content:await readFile(target,'utf8')}; }
   throw new Error('Unsupported operation');
 }
}
