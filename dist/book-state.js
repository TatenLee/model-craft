import {bookSections,bookSectionByKey} from './data/book.js';
import {bookMaterial} from './book-content.js';
import {codeAccepted} from './daily-state.js';
export const emptyBook=()=>({lastRead:'',records:{}});
export function normalizeBook(value){
 const out=emptyBook();
 if(bookSectionByKey.has(value?.lastRead))out.lastRead=value.lastRead;
 for(const section of bookSections){
  const r=value?.records?.[section.key];if(!r||typeof r!=='object'||Array.isArray(r))continue;
  const answers={};bookMaterial(section).checks.forEach((q,i)=>{const n=r.answers?.[i];if(Number.isInteger(n)&&n>=0&&n<q.options.length)answers[i]=n;});
  const text=(v,n=50)=>typeof v==='string'?v.slice(0,n):'';
  out.records[section.key]={openedAt:text(r.openedAt),readAt:text(r.readAt),anchor:typeof r.anchor==='string'&&/^(book|lesson)-[a-z0-9-]{1,70}$/.test(r.anchor)?r.anchor:'book-start',offset:Number.isFinite(r.offset)?Math.max(0,Math.min(6000,r.offset)):0,note:text(r.note,12000),answers};
 }
 if(out.lastRead&&!out.records[out.lastRead])out.lastRead='';
 return out;
}
export function bookRecord(state,key){return state.book.records[key]??={openedAt:'',readAt:'',anchor:'book-start',offset:0,note:'',answers:{}};}
export function bookAnswers(section,state){const m=bookMaterial(section),r=state.book.records[section.key];return m.checks.map((q,i)=>r?.answers?.[i]??(section.kind==='lesson'?(state.answers[q.id]?.selected??state.days[q.id?.match(/^w\d+-d\d+/)?.[0]]?.answers?.[q.id]?.selected):section.kind==='foundation'?state.foundations[section.source]?.answers?.[i]:undefined));}
export function bookStatus(section,state,exercises){const m=bookMaterial(section),answers=bookAnswers(section,state),correct=m.checks.filter((q,i)=>answers[i]===q.answer).length,ex=exercises.find(x=>x.id===m.exerciseId),code=!!ex&&codeAccepted(ex,state),note=state.book.records[section.key]?.note?.trim().length>=20;return {read:!!state.book.records[section.key]?.readAt,correct,total:m.checks.length,hasCode:!!ex,code,note:!!note,checked:correct===m.checks.length&&m.checks.length>0&&(!ex||code)&&!!note};}
export function readingResume(state){const last=bookSectionByKey.get(state.book?.lastRead);return last||bookSections.find(s=>!state.book?.records[s.key]?.readAt&&s.volumeId==='common')||bookSections[0];}
