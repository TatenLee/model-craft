import test from 'node:test';
import assert from 'node:assert/strict';
import {weeks,lessons,lessonExamples} from '../dist/data/curriculum.js';
import {categories,concepts,questions} from '../dist/data/concepts.js';
import {exercises} from '../dist/data/exercises.js';
import {createState,normalizeState,quizStats,escapeHTML} from '../dist/state.js';
import {gradientStep,mse,simulateRollout,recurrentStates} from '../dist/labs.js';
const catalog={weeks,lessons,categories,concepts,questions,exercises:[...exercises,...lessonExamples]};

test('12-week curriculum has complete, connected teaching content and realistic time budget',()=>{
 assert.equal(weeks.length,12);assert.equal(lessons.length,36);
 assert.equal(new Set(lessons.map(x=>x.id)).size,36);
 assert.ok(weeks.reduce((s,w)=>s+w.hours,0)>=120&&weeks.reduce((s,w)=>s+w.hours,0)<=144);
 for(const week of weeks){const members=lessons.filter(l=>l.week===week.id);assert.equal(members.length,3);for(const id of week.lessonIds)assert.ok(members.some(l=>l.id===id));}
 for(const l of lessons){assert.ok(l.sections.length>=3);assert.ok(l.sections.flatMap(s=>s.body).join('').length>150,`${l.id} has substantive content`);assert.ok(l.example.code.length>20);assert.ok(l.checkpoints.length>=2);assert.ok(l.sources.length>0);}
});
test('concepts include all original terms and valid related-concept links',()=>{
 assert.ok(concepts.length>=64);const ids=new Set(concepts.map(c=>c.id));assert.equal(ids.size,concepts.length);
 const categoryIds=new Set(categories.map(c=>c.id));
 for(const c of concepts){assert.ok(categoryIds.has(c.category));assert.ok(c.definition&&c.example&&c.pitfall);for(const r of c.related)assert.ok(ids.has(r),`${c.id} → ${r}`);}
 const hay=concepts.flatMap(c=>[c.id,c.term,c.english,...c.aliases]).join(' ').toLowerCase();
 for(const term of ['预训练','后训练','ar','sft','lora','jepa','视觉塔','kda','decoder','世界模型','具身','lsd','mmlu','mmmu','mmstar','rewardx'])assert.ok(hay.includes(term),term);
 for(const term of ['pt','rewardx']){const c=concepts.find(c=>c.id===term||c.term.toLowerCase()===term);assert.equal(c.status,'待确认');}
});
test('guided lessons provide prior teaching, worked examples, hints and recovery paths',()=>{
 const lessonIds=lessons.map(l=>l.id);
 for(const [index,l] of lessons.entries()){
  for(const id of l.prerequisites)assert.ok(lessonIds.indexOf(id)>=0&&lessonIds.indexOf(id)<index,`${l.id} requires an earlier lesson: ${id}`);
  assert.ok(l.terms.length>=3,l.id);
  for(const t of l.terms)assert.ok(t.name&&t.meaning&&t.example,`${l.id}: undefined term`);
  assert.ok(l.worked.steps.length>=3&&l.worked.takeaway,l.id);
  assert.ok(l.example.output&&l.example.explanation,l.id);
  for(const c of l.checks){assert.ok(c.prompt&&c.hint&&c.answer,l.id);assert.ok(l.sections[c.section],`${l.id}: invalid recovery section`);}
  assert.ok(l.guidedPractice.steps.length>=3,l.id);
  for(const t of l.guidedPractice.steps)assert.ok(t.action&&t.expected&&t.trouble,`${l.id}: incomplete practice guidance`);
  for(const link of l.links){
   const [,route,id]=link.href.match(/^#\/([^/]+)\/(.+)$/)||[];
   if(route==='code')assert.ok(catalog.exercises.some(e=>e.id===id),`${l.id}: ${link.href}`);
   if(route==='lesson')assert.ok(lessonIds.includes(id),`${l.id}: ${link.href}`);
  }
 }
 assert.equal(lessonExamples.length,lessons.length);
 assert.equal(new Set(lessonExamples.map(e=>e.id)).size,lessons.length);
 for(const ex of lessonExamples){assert.ok(lessonIds.includes(ex.sourceLessonId));assert.deepEqual(ex.tests,[]);}
 for(const week of weeks){
  assert.equal(week.schedule.length,7);
  assert.equal(week.schedule.reduce((sum,d)=>sum+d.minutes,0),week.hours*60);
  for(const d of week.schedule){assert.ok(d.action&&d.expected);if(d.lessonId)assert.ok(week.lessonIds.includes(d.lessonId));}
 }
});
test('weekly assessments link to already taught content and week one starts with training basics',()=>{
 for(const q of questions){const lesson=lessons.find(l=>l.id===q.lessonId);assert.ok(lesson,`${q.id} has a teaching page`);assert.ok(lesson.week<=q.week,`${q.id} must not depend on a future week`);}
 const firstWeek=[...questions.filter(q=>q.week===1),...lessons.filter(l=>l.week===1).flatMap(l=>l.checks)];
 assert.doesNotMatch(JSON.stringify(firstWeek),/SFT|LoRA|JEPA|Decoder|KDA|PT|logits/);
 assert.doesNotMatch(JSON.stringify(questions.filter(q=>q.week<5)),/SFT|LoRA/);
});
test('question bank is graded and covers every week with explanations',()=>{
 assert.ok(questions.length>=48);assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
 for(let w=1;w<=12;w++)assert.ok(questions.filter(q=>q.week===w).length>=4);
 for(const q of questions){assert.equal(q.options.length,4);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.ok(concepts.some(c=>c.id===q.conceptId));assert.ok(q.explanation.length>15);}
 assert.ok(new Set(questions.map(q=>q.answer)).size>=3);
});
test('coding challenges have runnable contracts, multiple checks, and progressive hints',()=>{
 assert.equal(exercises.length,8);for(const ex of exercises){assert.ok(ex.starter.includes('NotImplementedError'));assert.ok(ex.solution.length>100);assert.ok(ex.tests.length>=3);assert.ok(ex.hints.length>=2);for(const t of ex.tests)assert.ok(t.code&&t.name);}
});
test('progress import validates references and recomputes answers instead of trusting flags',()=>{
 const value=createState();value.completedLessons=[lessons[0].id,'unknown',lessons[0].id];value.bookmarks=['unknown',concepts[0].id];
 const q=questions[0],wrong=(q.answer+1)%4;value.answers[q.id]={selected:wrong,correct:true,attempts:2};value.answers.fake={selected:0,correct:true};
 value.notes[lessons[0].id]='<img src=x onerror=alert(1)>';value.notes.fake='bad';
 const restored=normalizeState(value,catalog);assert.deepEqual(restored.completedLessons,[lessons[0].id]);assert.deepEqual(restored.bookmarks,[concepts[0].id]);assert.equal(restored.answers[q.id].correct,false);assert.equal(restored.answers.fake,undefined);assert.equal(restored.notes.fake,undefined);assert.equal(quizStats(restored).wrong,1);
 assert.equal(escapeHTML(restored.notes[lessons[0].id]),'&lt;img src=x onerror=alert(1)&gt;');
 assert.throws(()=>normalizeState({version:99},catalog));
});
test('lesson example drafts survive imports without becoming graded exercise results',()=>{
 const value=createState(),example=lessonExamples[0];
 value.code[example.id]='print("my experiment")';
 value.codeResults[example.id]={passed:0,total:0};
 value.answers.q1={selected:0,correct:true};
 const restored=normalizeState(value,catalog);
 assert.equal(restored.code[example.id],value.code[example.id]);
 assert.equal(restored.codeResults[example.id].total,0);
 assert.equal(restored.answers.q1,undefined,'obsolete first-week answers must not grade rewritten questions');
});
test('numeric gradient lab actually converges and exposes excessive learning rates',()=>{
 let w=-1,b=-.5;const start=mse(w,b);for(let i=0;i<40;i++)({w,b}=gradientStep(w,b,.05));assert.ok(mse(w,b)<start*.001);
 w=-1;b=-.5;for(let i=0;i<20;i++)({w,b}=gradientStep(w,b,.8));assert.ok(mse(w,b)>start*1000);
});
test('world-model illustration distinguishes true-history and self-fed error',()=>{
 const free=simulateRollout(1.08,24),teacher=simulateRollout(1.08,24,true),noAction=simulateRollout(1.08,24,false,true);
 assert.ok(free.mse>teacher.mse);assert.ok(noAction.mse>free.mse);assert.equal(free.truth.length,25);
 assert.ok(recurrentStates(0).at(-1)>0);assert.equal(recurrentStates(4).at(-1),0);
});
