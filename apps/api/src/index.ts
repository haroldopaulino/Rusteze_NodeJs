import 'node:process';
import {createServer} from './server.js';
const {app}=await createServer();
const port=Number(process.env.PORT||8123);
try{await app.listen({host:process.env.API_HOST||'127.0.0.1',port});}catch(error){app.log.error(error);process.exit(1);}
for(const signal of ['SIGTERM','SIGINT'] as const) process.on(signal,()=>{void app.close().then(()=>process.exit(0));});
