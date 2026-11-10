import {challenge} from './practice/shared.js';
const make=(id,title,options)=>({...challenge(5,1,title,options),id,day:null,journey:true,level:'机器人主线',minutes:35});
export const journeyExercises=[
 make('journey-distill-signal','R15 · 让老师评价学生实际走过的路',{
  goal:'计算 teacher minus student 的 token 级 log-probability 信号，并排除不受监督的位置。',signature:'distill_signal(student_logps, teacher_logps, mask)',
  contract:'三个列表等长；两组 log-probability 必须为有限且不大于 0 的数字，mask 只能含 0/1。返回 (advantages, supervised_mean)：mask=0 的位置信号为 0，均值只除以有效位置数。无有效位置或非法输入抛 ValueError；不修改输入。',
  context:'输入是教师和学生对同一个学生采样 token、同一前缀给出的 log-probability。这里不训练语言模型，也不实现梯度；学习的是信号方向、对齐与 mask。',
  steps:['检查长度、数值与 mask，拒绝没有监督的 batch。','对有效位置计算 teacher_logp-student_logp，其余填 0。','求有效位置上的平均值，不把 prompt/tool/padding 位置算进分母。'],
  worked:'student=[-2,-1,-4], teacher=[-1,-3,-1], mask=[1,0,1] → advantages=[1,0,3]，有效均值=2。第二个位置即使差值为 -2，也不参与训练。',
  mistake:'这个均值不是完整 reverse KL。真正策略梯度中优势需 stop-gradient；教师必须评价学生所采样 token，不能换成教师自己的 argmax token。',
  transfer:'在 robot/training/distill.py 观察学生采样与教师打分，再迁移到真实训练器中的 rollout、teacher router、loss mask 和逐域评测。',
  cases:[['distill_signal([-2,-1,-4],[-1,-3,-1],[1,0,1])','([1,0,3],2)','排除工具与 prompt'],['distill_signal([-1],[-3],[1])','([-2],-2)','教师不认可'],['distill_signal([-2,-2],[-2,-2],[1,1])','([0,0],0)','分布在采样 token 上一致'],['distill_signal([-1,-100],[-2,-1],[1,0])','([-1,0],-1)','分母只算有效位置']],
  extraTests:[{name:'拒绝空监督、非有限概率和错误 mask',code:'for args in [([],[],[]),([-1],[-2],[0]),([-1],[1],[1]),([-1],[float("nan")],[1]),([-1],[-2],[2]),([-1],[],[1])]:\n    try: distill_signal(*args)\n    except ValueError: pass\n    else: raise AssertionError("非法监督未报错")'}],
  solution:'import math\ndef distill_signal(student_logps, teacher_logps, mask):\n    if len(student_logps)!=len(teacher_logps) or len(mask)!=len(student_logps):\n        raise ValueError("unaligned inputs")\n    if any(type(x) not in (int,float) or not math.isfinite(x) or x>0 for x in [*student_logps,*teacher_logps]):\n        raise ValueError("invalid log probabilities")\n    if any(type(m) not in (int,bool) or m not in (0,1) for m in mask) or not sum(mask):\n        raise ValueError("invalid supervision mask")\n    advantages=[t-s if m else 0.0 for s,t,m in zip(student_logps,teacher_logps,mask)]\n    return advantages,sum(advantages)/sum(mask)\n'
 }),
 make('journey-tool-result','R17 · 收到工具结果后，任务能向前走吗？',{
  goal:'仅接受当前请求、当前目标且已验证的结果，推进一项任务。',signature:'advance_task(goals, index, request_id, result)',
  contract:'goals 为非空字符串目标列表；index 为 [0,len(goals)] 内整数，request_id 为非空字符串；result 为字典。只有 result 的 request_id、goal 匹配且 verified is True 时返回 index+1，否则保持 index。已完成时始终返回原 index；非法契约抛 ValueError；不得修改输入。',
  context:'模拟 Agent 等待 move_to 后的反馈。旧请求返回、错误目标、字符串 "true"、模型口头宣称成功，都不等于环境验证通过。',
  steps:['检查任务列表、索引、请求编号与结果类型。','如果 index 已到任务末尾，直接返回，不访问越界目标。','精确匹配请求和目标，并检查 verified 的布尔值，才允许推进一次。'],
  worked:'goals=["red","blue"], index=0, request_id="r1"。结果 {"request_id":"r1","goal":"red","verified":True} 返回 1。旧请求 r0 即使成功，也保持 0。',
  mistake:'不能用 if result["verified"] 接受任意真值；字符串 "false" 在 Python 中也是真。不能只比较目标名而忽略请求归属。',
  transfer:'用相同思路检查真实工具 schema、episode/request ID、预算与终止。此函数只处理状态推进，执行动作与环境验证由其他模块承担。',
  cases:[['advance_task(["red","blue"],0,"r1",{"request_id":"r1","goal":"red","verified":True})','1','当前请求已验证'],['advance_task(["red"],0,"r1",{"request_id":"r0","goal":"red","verified":True})','0','过期请求'],['advance_task(["red"],0,"r1",{"request_id":"r1","goal":"red","verified":"true"})','0','拒绝文本成功'],['advance_task(["red"],1,"r1",{})','1','完成后不越界'],['advance_task(["red","blue"],0,"r1",{"request_id":"r1","goal":"blue","verified":True})','0','错误目标']],
  extraTests:[{name:'拒绝越界与错误协议，保留输入',code:'goals=["red"]\nr={"request_id":"r1","goal":"red","verified":True}\nassert advance_task(goals,0,"r1",r)==1\nassert goals==["red"] and r["verified"] is True\nfor args in [([],0,"r1",{}),(["red"],-1,"r1",{}),(["red"],0,"",{}),(["red"],0,"r1",[])]:\n    try: advance_task(*args)\n    except ValueError: pass\n    else: raise AssertionError("无效契约未报错")'}],
  solution:'def advance_task(goals, index, request_id, result):\n    if not goals or any(not isinstance(g,str) or not g for g in goals) or type(index) is not int or not 0<=index<=len(goals):\n        raise ValueError("invalid task")\n    if not isinstance(request_id,str) or not request_id or not isinstance(result,dict):\n        raise ValueError("invalid protocol")\n    if index==len(goals):\n        return index\n    verified=result.get("verified") is True\n    matched=result.get("request_id")==request_id and result.get("goal")==goals[index]\n    return index+1 if verified and matched else index\n'
 })
];
