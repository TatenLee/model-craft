export const S = {
  torch: {label:'PyTorch：自动求导',url:'https://docs.pytorch.org/tutorials/beginner/basics/autogradqs_tutorial.html'},
  transformer: {label:'Attention Is All You Need',url:'https://arxiv.org/abs/1706.03762'},
  masks: {label:'PyTorch Transformer：mask 语义',url:'https://docs.pytorch.org/docs/stable/generated/torch.nn.Transformer.html'},
  cs336: {label:'Stanford CS336：从零训练语言模型',url:'https://cs336.stanford.edu/spring2025/'},
  ce: {label:'PyTorch CrossEntropyLoss',url:'https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html'},
  adam: {label:'Decoupled Weight Decay Regularization',url:'https://arxiv.org/abs/1711.05101'},
  hf: {label:'Hugging Face LLM Course',url:'https://huggingface.co/learn/llm-course/chapter1/1'},
  instruct: {label:'Training language models to follow instructions',url:'https://arxiv.org/abs/2203.02155'},
  lora: {label:'LoRA 原论文',url:'https://arxiv.org/abs/2106.09685'},
  qlora: {label:'QLoRA 原论文',url:'https://arxiv.org/abs/2305.14314'},
  dpo: {label:'Direct Preference Optimization',url:'https://arxiv.org/abs/2305.18290'},
  grpo: {label:'DeepSeekMath：GRPO',url:'https://arxiv.org/abs/2402.03300'},
  clip: {label:'CLIP 原论文',url:'https://arxiv.org/abs/2103.00020'},
  dino: {label:'DINO：自监督视觉 Transformer',url:'https://arxiv.org/abs/2104.14294'},
  llava: {label:'Visual Instruction Tuning',url:'https://arxiv.org/abs/2304.08485'},
  vae: {label:'Auto-Encoding Variational Bayes',url:'https://arxiv.org/abs/1312.6114'},
  vq: {label:'Neural Discrete Representation Learning',url:'https://arxiv.org/abs/1711.00937'},
  ldm: {label:'Latent Diffusion Models',url:'https://arxiv.org/abs/2112.10752'},
  ddpm: {label:'Denoising Diffusion Probabilistic Models',url:'https://arxiv.org/abs/2006.11239'},
  flow: {label:'Flow Matching for Generative Modeling',url:'https://arxiv.org/abs/2210.02747'},
  mit: {label:'MIT：Flow Matching 与 Diffusion',url:'https://diffusion.csail.mit.edu/'},
  dit: {label:'Scalable Diffusion Models with Transformers',url:'https://arxiv.org/abs/2212.09748'},
  reward: {label:'ImageReward',url:'https://arxiv.org/abs/2304.05977'},
  ddpo: {label:'Training Diffusion Models with Reinforcement Learning',url:'https://arxiv.org/abs/2305.13301'},
  jepa: {label:'I-JEPA 原论文',url:'https://arxiv.org/abs/2301.08243'},
  vjepa: {label:'V-JEPA 2：理解、预测与规划',url:'https://arxiv.org/abs/2506.09985'},
  kda: {label:'Kimi Linear：Kimi Delta Attention',url:'https://arxiv.org/abs/2510.26692'},
  vla: {label:'OpenVLA',url:'https://arxiv.org/abs/2406.09246'},
  policy: {label:'Diffusion Policy',url:'https://diffusion-policy.cs.columbia.edu/'},
  mmlu: {label:'MMLU 原论文',url:'https://arxiv.org/abs/2009.03300'},
  mmmu: {label:'MMMU 官方项目',url:'https://mmmu-benchmark.github.io/'},
  mmstar: {label:'MMStar 官方项目',url:'https://mmstar-benchmark.github.io/'},
  repro: {label:'PyTorch：可复现性',url:'https://docs.pytorch.org/docs/stable/notes/randomness.html'},
  checkpoint: {label:'PyTorch：保存与加载模型',url:'https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html'},
  fsdp: {label:'PyTorch FSDP2 教程',url:'https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html'}
};

export const term=(name,meaning,example)=>({name,meaning,example});
export const step=(title,...body)=>({title,body});
export const check=(prompt,hint,answer,section)=>({prompt,hint,answer,section});
export const task=(action,expected,trouble)=>({action,expected,trouble});
export function lesson(week,number,data){
 const id=`w${week}-l${number}`;
 return {id,week,minutes:60,...data,
  objectives:data.objectives||data.checks.map(c=>'结合算例解释：'+c.prompt),
  checkpoints:data.checks.map(c=>c.prompt),
  guidedPractice:data.practice,
  practice:{title:data.practice.title,steps:data.practice.steps.map(s=>s.action)},
  prerequisites:data.prerequisites||[],
  links:data.links||[],
  example:{title:'跟着代码走一遍',...data.example},
 };
}
