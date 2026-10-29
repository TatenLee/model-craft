export const STORAGE_KEY='model-craft:learning:v1';
export function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function createState(){return {version:1,startDate:localDate(),completedLessons:[],bookmarks:[],notes:{},answers:{},examHistory:[],code:{},codeResults:{},solutionsViewed:[],experiments:[]};}
const bounded=(value,n=12000)=>typeof value==='string'?value.slice(0,n):'';
export function normalizeState(value,catalog){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1)throw new Error('备份格式不受支持。请导入 Model Craft 导出的 JSON 文件。');
 const state=createState();
 const ids=name=>new Set((catalog[name]||[]).map(x=>x.id));
 const lessonIds=ids('lessons'),conceptIds=ids('concepts'),exerciseIds=ids('exercises');
 const questions=new Map((catalog.questions||[]).map(q=>[q.id,q]));
 const validList=(key,allowed)=>Array.isArray(value[key])?[...new Set(value[key].filter(x=>typeof x==='string'&&allowed.has(x)))]:[];
 if(typeof value.startDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.startDate)&&!Number.isNaN(Date.parse(value.startDate)))state.startDate=value.startDate;
 state.completedLessons=validList('completedLessons',lessonIds);state.bookmarks=validList('bookmarks',conceptIds);state.solutionsViewed=validList('solutionsViewed',exerciseIds);
 for(const [key,note]of Object.entries(value.notes||{}))if(lessonIds.has(key))state.notes[key]=bounded(note);
 for(const [key,code]of Object.entries(value.code||{}))if(exerciseIds.has(key))state.code[key]=bounded(code,50000);
 for(const [key,result]of Object.entries(value.codeResults||{}))if(exerciseIds.has(key)&&result&&Number.isInteger(result.total)&&Number.isInteger(result.passed)&&result.total>=0&&result.total<=100&&result.passed>=0&&result.passed<=result.total)state.codeResults[key]={passed:result.passed,total:result.total,at:bounded(result.at,50),usedSolution:!!result.usedSolution};
 for(const [key,answer]of Object.entries(value.answers||{})){
  const q=questions.get(key);if(q&&answer&&Number.isInteger(answer.selected)&&answer.selected>=0&&answer.selected<q.options.length)state.answers[key]={selected:answer.selected,correct:answer.selected===q.answer,at:bounded(answer.at,50),attempts:Math.max(1,Math.min(999,Number(answer.attempts)||1))};
 }
 if(Array.isArray(value.examHistory))state.examHistory=value.examHistory.slice(-60).filter(x=>x&&Number.isInteger(x.correct)&&Number.isInteger(x.total)&&x.total>0&&x.correct>=0&&x.correct<=x.total).map(x=>({at:bounded(x.at,50),label:bounded(x.label,100),correct:x.correct,total:x.total}));
 const fields=['title','hypothesis','baseline','variable','dataset','seed','budget','metric','result','interpretation','next','status'];
 if(Array.isArray(value.experiments))state.experiments=value.experiments.slice(0,100).filter(x=>x&&typeof x.title==='string').map((x,i)=>Object.fromEntries([['id',bounded(x.id,80)||`import-${i}`],['createdAt',bounded(x.createdAt,50)],['updatedAt',bounded(x.updatedAt,50)],...fields.map(f=>[f,bounded(x[f],f==='title'?160:8000)])]));
 return state;
}
export function quizStats(state){const records=Object.values(state.answers);return {attempted:records.length,correct:records.filter(x=>x.correct).length,wrong:records.filter(x=>!x.correct).length};}
export function currentWeek(state){const start=new Date(state.startDate+'T00:00:00');const today=new Date(localDate()+'T00:00:00');return Math.min(12,Math.max(1,Math.floor((today-start)/86400000/7)+1));}
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
