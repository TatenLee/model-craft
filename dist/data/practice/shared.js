// Every challenge is executable using Python's standard library in the browser.
export function challenge(week,day,title,d){
 const id=`daily-w${week}-d${day}`;
 const tests=d.cases.map(([call,expected,why],i)=>({name:`用例 ${i+1} · ${why}`,code:`import math\ndef _same(a,b):\n    if isinstance(b,(list,tuple)):\n        return isinstance(a,(list,tuple)) and len(a)==len(b) and all(_same(x,y) for x,y in zip(a,b))\n    if isinstance(b,dict):\n        return isinstance(a,dict) and a.keys()==b.keys() and all(_same(a[k],b[k]) for k in b)\n    if isinstance(b,bool):\n        return type(a) is bool and a==b\n    if isinstance(b,(int,float)):\n        return isinstance(a,(int,float)) and math.isclose(a,b,rel_tol=1e-7,abs_tol=1e-7)\n    return a==b\n_actual=${call}\n_expected=${expected}\nassert _same(_actual,_expected), ${JSON.stringify('输入: '+call+'\n')} + "预期: " + repr(_expected) + "\\n实际: " + repr(_actual)`}));
 return {id,week,day,title,minutes:day===7?90:45,level:day===7?'周综合项目':'每日编程',...d,
  summary:d.goal,instructions:[d.contract,...d.steps],
  starter:`import math\n\ndef ${d.signature}:\n    # ${d.goal}\n    # 在这里完成计算；使用 return 返回结果，而不是只 print。\n    raise NotImplementedError("请实现本题接口")\n`,
  tests:[...tests,...(d.extraTests||[])],
  examples:d.cases.slice(0,2).map(([call,expected,why])=>({call,expected,why})),
  explanation:d.transfer,
  hints:[d.steps[0],d.steps.slice(1).join(' '),d.mistake],
 };
}
