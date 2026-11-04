import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const code=readFileSync(new URL('../graphql-playground.js',import.meta.url),'utf8');
const captured=[];
const context=vm.createContext({});
vm.runInContext(code.slice(0,code.indexOf('const $ =')),context);
const examples=vm.runInContext('examples',context);
assert.equal(examples.length,21);
const names=new Set();
for(const example of examples){
 assert.ok(example.category && example.name && example.description && example.query);
 assert.ok(!names.has(example.name));names.add(example.name);
 assert.match(example.query,/^(query|mutation)\s+\w+/);
 assert.deepEqual(JSON.parse(JSON.stringify(example.variables||{})),JSON.parse(JSON.stringify(example.variables||{})));
}
for(const category of ['Getting started','MySQL','Storage','Notifications','Plugin lifecycle','Schema explorer'])assert.ok(examples.some(e=>e.category===category));
assert.equal(examples.filter(e=>e.mutates).length,8);
console.log(`Validated ${examples.length} premade GraphQL queries and mutations in six categories.`);
