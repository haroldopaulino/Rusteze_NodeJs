import { graphql, GraphQLBoolean, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLScalarType, GraphQLSchema, GraphQLString, Kind, valueFromASTUntyped } from 'graphql';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PluginRegistry } from '@upp/sdk';
import { z } from 'zod';

const Json = new GraphQLScalarType({
 name: 'JSON', description: 'Arbitrary JSON value used by SDK plugin operations',
 serialize: value => value, parseValue: value => value,
 parseLiteral: node => valueFromASTUntyped(node)
});
const PluginType = new GraphQLObjectType({name:'SdkPlugin',fields:{
 id:{type:new GraphQLNonNull(GraphQLString)},name:{type:new GraphQLNonNull(GraphQLString)},
 description:{type:new GraphQLNonNull(GraphQLString)},version:{type:new GraphQLNonNull(GraphQLString)},
 state:{type:new GraphQLNonNull(GraphQLString)},error:{type:GraphQLString},operations:{type:new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))}
}});
const EventType = new GraphQLObjectType({name:'SdkEvent',fields:{
 timestamp:{type:new GraphQLNonNull(GraphQLString)},type:{type:new GraphQLNonNull(GraphQLString)},payload:{type:Json}
}});
const NoteType = new GraphQLObjectType({name:'SdkNote',fields:{
 id:{type:new GraphQLNonNull(GraphQLInt)},text:{type:new GraphQLNonNull(GraphQLString)},createdAt:{type:GraphQLString,resolve: (note:Record<string,unknown>) => {const value=note.created_at ?? note.createdAt;return value instanceof Date?value.toISOString():value == null?null:String(value);}}
}});
const ActionResultType=new GraphQLObjectType({name:'SdkActionResult',fields:{id:{type:GraphQLString},text:{type:GraphQLString},result:{type:Json}}});
const contextFor=(registry:PluginRegistry)=>({registry});
type Context=ReturnType<typeof contextFor>;
const toInput=(value:unknown):Record<string,unknown>=>{if(value===undefined||value===null)return {};if(typeof value!=='object'||Array.isArray(value))throw new Error('input must be a JSON object');return value as Record<string,unknown>;};
const Query=new GraphQLObjectType({name:'Query',fields:{
 health:{type:new GraphQLNonNull(GraphQLString),resolve:()=> 'ok'},
 plugins:{type:new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PluginType))),resolve:(_s,_a,c:Context)=>c.registry.list()},
 events:{type:new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EventType))),args:{limit:{type:GraphQLInt}},resolve:(_s,{limit}:{limit?:number},c:Context)=>c.registry.events(limit??50)},
 notes:{type:new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(NoteType))),resolve:(_s,_a,c:Context)=>c.registry.execute('mysql','listNotes',{})},
 executePlugin:{type:Json,args:{pluginId:{type:new GraphQLNonNull(GraphQLString)},operation:{type:new GraphQLNonNull(GraphQLString)},input:{type:Json}},resolve:(_s,a:{pluginId:string;operation:string;input?:unknown},c:Context)=>c.registry.execute(a.pluginId,a.operation,toInput(a.input))}
}});
const Mutation=new GraphQLObjectType({name:'Mutation',fields:{
 addNote:{type:new GraphQLNonNull(ActionResultType),args:{text:{type:new GraphQLNonNull(GraphQLString)}},resolve:async(_s,{text}:{text:string},c:Context)=>c.registry.execute('mysql','addNote',{text})},
 enablePlugin:{type:PluginType,args:{id:{type:new GraphQLNonNull(GraphQLString)}},resolve:(_s,{id}:{id:string},c:Context)=>c.registry.enable(id)},
 disablePlugin:{type:PluginType,args:{id:{type:new GraphQLNonNull(GraphQLString)}},resolve:(_s,{id}:{id:string},c:Context)=>c.registry.disable(id)},
 executePlugin:{type:Json,args:{pluginId:{type:new GraphQLNonNull(GraphQLString)},operation:{type:new GraphQLNonNull(GraphQLString)},input:{type:Json}},resolve:(_s,a:{pluginId:string;operation:string;input?:unknown},c:Context)=>c.registry.execute(a.pluginId,a.operation,toInput(a.input))}
}});
export const rustezeSchema=new GraphQLSchema({query:Query,mutation:Mutation});
const bodySchema=z.object({query:z.string().min(1).max(10000),variables:z.record(z.unknown()).optional(),operationName:z.string().optional()});
export function registerGraphQLRoutes(app:FastifyInstance, registry:PluginRegistry){
 const authenticate=async(req:FastifyRequest,reply:FastifyReply)=>{
  const key=process.env.ADMIN_API_KEY;
  if(!key){reply.code(503).send({error:'ADMIN_API_KEY is not configured'});return;}
  if(req.headers['x-api-key']!==key){reply.code(401).send({error:'Missing or invalid X-API-Key'});}
 };
 app.post('/graphql',{preHandler:authenticate,bodyLimit:65536},async(request,reply)=>{
  const parsed=bodySchema.safeParse(request.body);
  if(!parsed.success)return reply.code(400).send({errors:[{message:'Invalid GraphQL request body',details:parsed.error.issues}]});
  const result=await graphql({schema:rustezeSchema,source:parsed.data.query,variableValues:parsed.data.variables,operationName:parsed.data.operationName,contextValue:contextFor(registry)});
  return reply.code(result.errors?.length?400:200).send(result);
 });
}
