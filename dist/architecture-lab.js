const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
export function architectureBudget({tokens=8192,window=1024,topk=512,kvHeads=8}={}){
 if(!integer(tokens,1,65536)||!integer(window,1,65536)||!integer(topk,1,65536)||![1,2,4,8,16,32].includes(kvHeads))throw new Error('长度、窗口、k 须为 1–65536 的整数；KV 头数需能整除 32。');
 const layers=32,heads=32,dim=128,bytes=2;
 const kv=h=>layers*tokens*h*dim*2*bytes;
 const pairs=n=>{const w=Math.min(n,tokens);return w*(w+1)/2+(tokens-w)*w;};
 return {mha:kv(heads),gqa:kv(kvHeads),mqa:kv(1),swa:layers*Math.min(tokens,window)*kvHeads*dim*2*bytes,mla:layers*tokens*(512+64)*bytes,state:layers*heads*dim*dim*4,densePairs:pairs(tokens),windowPairs:pairs(window),sparsePairs:pairs(topk),indexPairs:pairs(tokens)};
}
export function causalSelection(scores,position,k){
 if(!Array.isArray(scores)||!scores.length||!scores.every(Number.isFinite)||!integer(position,0,scores.length-1)||!integer(k,0,scores.length))throw new Error('非法因果选择参数');
 return Array.from({length:position+1},(_,i)=>i).sort((a,b)=>scores[b]-scores[a]||a-b).slice(0,k);
}
export function deltaStep(alpha=[0.5,1],beta=0.5){
 if(!Array.isArray(alpha)||alpha.length!==2||![...alpha,beta].every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw new Error('门值必须在 0–1 内');
 const old=[[2,0],[0,4]],key=[1,0],value=[5,1],query=[1,1];
 const decayed=old.map((row,i)=>row.map(x=>x*alpha[i]));
 const prediction=value.map((_,j)=>key.reduce((sum,k,i)=>sum+k*decayed[i][j],0));
 const error=value.map((v,j)=>v-prediction[j]);
 const state=decayed.map((row,i)=>row.map((x,j)=>x+beta*key[i]*error[j]));
 const output=value.map((_,j)=>query.reduce((sum,q,i)=>sum+q*state[i][j],0));
 return {decayed,prediction,error,state,output};
}
export function scalarSSM(a,inputs=[1,0,0,0,0,0],initial=0){
 if(![a,initial,...inputs].every(Number.isFinite))throw new Error('需要有限数值');
 let h=initial;return inputs.map(x=>(h=a*h+x));
}
