export function codeFingerprint(code){let hash=2166136261;for(let i=0;i<code.length;i++)hash=Math.imul(hash^code.charCodeAt(i),16777619);return `${code.length}:${hash>>>0}`;}
export function codeAccepted(ex,state){
 const r=state.codeResults[ex.id];
 return !!r&&r.status==='success'&&r.codeHash===codeFingerprint(state.code[ex.id]??ex.starter)&&r.total===ex.tests.length&&r.passed===ex.tests.length;
}
export function dayStatus(day,state,exercise){
 const record=state.days?.[day.id]||{};
 const read=!!record.read,correct=day.checks.filter(q=>record.answers?.[q.id]?.selected===q.answer).length;
 const code=codeAccepted(exercise,state),ready=read&&correct===day.checks.length&&code;
 return {read,correct,code,ready,completed:ready&&!!record.completedAt,missing:[...(!read?['确认完成本日讲解与推演']:[]),...(correct<day.checks.length?['完成互动题并修正错题']:[]),...(!code?[exercise.tests.length?'提交当前代码并通过全部检查':'成功运行当前示例代码']:[])]};
}
export function normalizeDays(value,days){
 const out={};
 for(const day of days||[]){
  const raw=value?.[day.id];if(!raw||typeof raw!=='object')continue;
  const answers={};
  for(const q of day.checks){const a=raw.answers?.[q.id];if(a&&Number.isInteger(a.selected)&&a.selected>=0&&a.selected<q.options.length)answers[q.id]={selected:a.selected,attempts:Math.min(999,Math.max(1,Number(a.attempts)||1))};}
  out[day.id]={read:raw.read===true,reflection:typeof raw.reflection==='string'?raw.reflection.slice(0,12000):'',completedAt:typeof raw.completedAt==='string'?raw.completedAt.slice(0,50):'',answers};
 }
 return out;
}
