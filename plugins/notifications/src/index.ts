import type { Plugin, PluginContext, JsonObject } from '@upp/sdk';
export class NotificationsPlugin implements Plugin {
 id='notifications'; name='Notification Simulator'; description='Capture outbound notifications without sending real email'; version='1.0.0'; operations=['send','history'] as const;
 private messages: {id:number;recipient:string;message:string;timestamp:string}[]=[];
 private context?:PluginContext;
 async start(context:PluginContext) { this.context=context; context.log('Notification simulator online'); }
 async stop() { this.context=undefined; }
 async execute(operation:string,input:JsonObject) {
  if(operation==='history') return this.messages.slice(-50).reverse();
  if(operation==='send') {
   if(typeof input.recipient!=='string'||!input.recipient.trim()||input.recipient.length>120) throw new Error('recipient is required');
   if(typeof input.message!=='string'||!input.message.trim()||input.message.length>1000) throw new Error('message must be 1–1000 characters');
   const msg={id:this.messages.length+1,recipient:input.recipient,message:input.message,timestamp:new Date().toISOString()};
   this.messages.push(msg); this.context?.emit('notification.simulated',{recipient:msg.recipient,id:msg.id}); return {status:'simulated',...msg};
  }
  throw new Error('Unsupported operation');
 }
}
