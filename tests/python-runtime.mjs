// Executes the actual worker harness with Pyodide WASM in Node. This does not replace browser QA.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {loadPyodide} from 'pyodide';
import {exercises} from '../dist/data/exercises.js';
import {dailyChallenges} from '../dist/data/practice/index.js';
import {lessonExamples} from '../dist/data/curriculum.js';
const cache=resolve('.openai/local');await mkdir(cache,{recursive:true});
const stdlib=resolve(cache,'python_stdlib.zip');
try{await access(stdlib);}catch{
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch('https://cdn.jsdelivr.net/pyodide/v0.29.2/full/python_stdlib.zip',{signal:AbortSignal.timeout(20000)});
   assert.equal(response.ok,true);await writeFile(stdlib,new Uint8Array(await response.arrayBuffer()));break;
  }catch(error){if(attempt===3)throw error;console.warn(`Pyodide download attempt ${attempt} failed; retrying.`);}
 }
}
const runtime=await loadPyodide({stdLibURL:stdlib});
let messages=[];
const context=vm.createContext({self:{postMessage:message=>messages.push(message)},importScripts:()=>{},loadPyodide:async()=>runtime});
vm.runInContext(await readFile(new URL('../dist/python-worker.js',import.meta.url),'utf8'),context);
async function run(code,tests){messages=[];await context.self.onmessage({data:{code,tests}});const result=messages.find(m=>m.type==='result');assert.ok(result,JSON.stringify(messages));return result.result;}
let total=0;
for(const exercise of [...exercises,...dailyChallenges]){
 const result=await run(exercise.solution,exercise.tests);
 assert.equal(result.error,null,exercise.id);assert.equal(result.tests.length,exercise.tests.length,exercise.id);
 assert.ok(result.tests.every(check=>check.passed),JSON.stringify(result));total+=result.tests.length;
 const starter=await run(exercise.starter,exercise.tests);
 assert.ok(starter.error||starter.tests.some(check=>!check.passed),'incomplete starter must not pass');
}
// Wrong constant implementations must be rejected, with expected/actual values for repair.
const predictChallenge=dailyChallenges[0];
const wrong=await run('def predict(xs,w,b):\n    return [0 for _ in xs]',predictChallenge.tests);
assert.ok(wrong.tests.some(t=>!t.passed));
assert.match(wrong.tests.find(t=>!t.passed).error,/预期:.*实际:/s);
const broken=await run('raise ValueError("test failure")',[]);assert.match(broken.error,/ValueError/);
const output=await run('print("真实 Python 输出")',[]);assert.match(output.stdout,/真实 Python 输出/);
for(const example of lessonExamples){
 const result=await run(example.starter,example.tests);
 assert.equal(result.error,null,example.id);
 assert.equal(result.stdout.trim(),example.expectedOutput.trim(),example.id);
 assert.equal(result.tests.length,0,'exploratory examples must not award challenge points');
}
console.log(`${total} reference assertions passed in Pyodide; incomplete/error submissions rejected; stdout captured.`);
console.log(`${lessonExamples.length} lesson examples executed with their documented output in the same Pyodide worker harness.`);
