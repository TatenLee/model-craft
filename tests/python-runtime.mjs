import {conceptExamples} from '../dist/data/concept-examples.js';
import {bookExercises} from '../dist/data/book-practice.js';
import {foundations} from '../dist/data/foundations.js';
// Executes the actual worker harness with Pyodide WASM in Node. This does not replace browser QA.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {loadPyodide} from 'pyodide';
import {journeyExercises} from '../dist/data/journey-practice.js';
import {architectureExercises} from '../dist/data/architecture-practice.js';
import {projectExercises} from '../dist/data/projects.js';
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
for(const exercise of [...exercises,...dailyChallenges,...projectExercises,...architectureExercises,...journeyExercises,...bookExercises]){
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

for(const f of foundations){const result=await run(f.example.code,[]);assert.equal(result.error,null,f.id);assert.equal(result.stdout.trim(),f.example.output.trim(),f.id);}
console.log('3 foundation examples executed with documented output.');

for(const ex of conceptExamples){const result=await run(ex.starter,[]);assert.equal(result.error,null,ex.id);assert.equal(result.stdout.trim(),ex.expectedOutput.trim(),ex.id);assert.equal(result.tests.length,0);}
console.log(`${conceptExamples.length} concept examples executed with documented output, without challenge credit.`);
// Verify the changed-input predictions, not only the pristine examples.
const variants=[
 ['gradient','0.1','0.3','loss: 4.00 -> 16.00\nw=4.40, b=2.20'],
 ['softmax','scores = [0.0, math.log(3)]','scores = [1000.0, 1000.0 + math.log(3)]','[0.25, 0.75]\nsum=1.00'],
 ['attention','allowed = [True, True]','allowed = [True, False]','[1.0, 0.0]\noutput=2.00'],
 ['window','window = 5, 2','window = 5, 3','0 [0]\n1 [0, 1]\n2 [0, 1, 2]\n3 [1, 2, 3]\n4 [2, 3, 4]'],
 ['lora','scale = 1.0','scale = 0.0','base: [1, 2, 3, 6]\nadapted: [1.0, 2.0, 3.0, 6.0]\nW parameters: 12 adapter: 7'],
 ['lora','scale = 1.0','scale = 2.0','base: [1, 2, 3, 6]\nadapted: [0.6, 1.2, 1.8, 4.4]\nW parameters: 12 adapter: 7'],
 ['loss-mask','mask = [0, 0, 1, 1]','mask = [1, 1, 1, 1]','supervised=4, loss=3.25'],
 ['accumulation','counts = [3, 1]','counts = [2, 2]','naive=3.50, token_mean=3.50'],
 ['return','gamma = 0.5','gamma = 1.0','returns: [3.0, 2.0, 2.0]\nadvantages: [2.0, 1.0, 1.0]'],
 ['ppo','epsilon = 0.2','epsilon = 0.0','ratio=1.5, A=2.0, objective=2.0\nratio=1.5, A=-2.0, objective=-3.0\nratio=0.5, A=-2.0, objective=-2.0'],
 ['state','decay, state = 0.5','decay, state = 1.0','state=2.00\nstate=2.00\nstate=2.00'],
 ['state','decay, state = 0.5','decay, state = 0.0','state=2.00\nstate=0.00\nstate=0.00'],
 ['flow','steps, x = 4','steps, x = 2','t=0.50, x=1.00\nt=1.00, x=2.00'],
 ['cfg','unconditional, conditional = 2.0, 5.0','unconditional, conditional = 2.0, -1.0','scale=0.0, output=2.0\nscale=1.0, output=-1.0\nscale=2.0, output=-4.0'],
 ['cache','2, 1, 2, 4, 2','2, 2, 2, 4, 2','tokens=8, KV bytes=1024\ntokens=16, KV bytes=2048'],
 ['ema','momentum = 0.9','momentum = 0.0','teacher=10.00\nteacher=10.00\nteacher=0.00'],
 ['ema','momentum = 0.9','momentum = 0.99','teacher=0.10\nteacher=0.20\nteacher=0.20'],
 ['navigation','# Try: grid[1][3] = "#"','grid[1][3] = "#"','shortest steps: 6']
];
for(const [id,from,to,expected] of variants){const ex=conceptExamples.find(ex=>ex.id==='concept-'+id);assert.ok(ex.starter.includes(from),id);const result=await run(ex.starter.replace(from,to),[]);assert.equal(result.error,null,id);assert.equal(result.stdout.trim(),expected,id);}
const nav=conceptExamples.find(ex=>ex.id==='concept-navigation').starter;
const blocked=await run(nav.replace('# Try: grid[1][3] = "#"','grid[1][3] = "#"').replace('# Then also try: grid[2] = list("#######")','grid[2] = list("#######")'),[]);
assert.equal(blocked.stdout.trim(),'shortest steps: None');
const sameGoal=await run(nav.replace('(1,1), (1,5)','(1,1), (1,1)'),[]);assert.equal(sameGoal.stdout.trim(),'shortest steps: 0');
const allMasked=await run(conceptExamples.find(ex=>ex.id==='concept-loss-mask').starter.replace('mask = [0, 0, 1, 1]','mask = [0, 0, 0, 0]'),[]);assert.match(allMasked.error,/AssertionError/);
const metricVariant=await run(conceptExamples.find(ex=>ex.id==='concept-metrics').starter.replace('0.01, 1.0','0.001, 1.0').replace('math.log(4)','math.log(2)'),[]);assert.equal(metricVariant.stdout.trim(),'PSNR=30.00 dB\nPPL=2.00');
console.log(`${variants.length+4} concept changes/boundaries verified in real Python.`);
