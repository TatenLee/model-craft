import {days} from './data/days.js';
import {lessons} from './data/curriculum.js';
import {foundations} from './data/foundations.js';
import {questions} from './data/concepts.js';
import {bookUnitById} from './data/book-units.js';
export function bookMaterial(section){
 if(section.kind==='unit'){const u=bookUnitById.get(section.source);return {...u,checks:[u.check]};}
 if(section.kind==='foundation'){const f=foundations.find(x=>x.id===section.source);return {...f,foundation:f,terms:f.terms.map(([name,meaning])=>({name,meaning}))};}
 const lesson=lessons.find(x=>x.id===section.source),[,week,n]=lesson.id.match(/w(\d+)-l(\d+)/),quiz=questions.filter(q=>q.lessonId===lesson.id),checks=(quiz.length?quiz:days.find(d=>d.lessonId===lesson.id).checks).slice(0,2);
 return {lesson,goal:lesson.objectives.join('；'),sources:lesson.sources,exerciseId:`daily-w${week}-d${Number(n)*2}`,checks:checks.map(q=>({...q,prompt:q.question}))};
}
