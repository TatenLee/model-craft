import week01 from './course/week-01.js';
import week02 from './course/week-02.js';
import week03 from './course/week-03.js';
import week04 from './course/week-04.js';
import week05 from './course/week-05.js';
import week06 from './course/week-06.js';
import week07 from './course/week-07.js';
import week08 from './course/week-08.js';
import week09 from './course/week-09.js';
import week10 from './course/week-10.js';
import week11 from './course/week-11.js';
import week12 from './course/week-12.js';
import {weekMetadata} from './course/weeks.js';
import {enrichWeek} from './course/schedule.js';

export const COURSE_REVISION = 'daily-v3';
export const lessons = [...week01,...week02,...week03,...week04,...week05,...week06,...week07,...week08,...week09,...week10,...week11,...week12 ];
export const weeks = weekMetadata.map(w=>enrichWeek(w,lessons));
export const lessonExamples = lessons.map(l=>({
 id:'lesson-'+l.id,sourceLessonId:l.id,title:'本课示例 · '+l.title,week:l.week,minutes:15,
 summary:l.example.explanation,level:'示例实验',
 instructions:['先保持原代码运行，对照课文预期输出。','再只改一个值，先预测结果再运行；示例运行不会计入编程挑战通过数量。'],
 starter:l.example.code,solution:l.example.code,tests:[],
 hints:[l.example.explanation,'预期输出：\n'+l.example.output],
 explanation:l.example.explanation,expectedOutput:l.example.output
}));
