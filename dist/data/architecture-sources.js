// Versioned research snapshot. Only papers and model-author repositories/cards.
export const architectureUpdated='2026-11-10';
const paper=(label,id)=>({label,url:`https://arxiv.org/abs/${id}`});
export const architectureSources={
 mistral:paper('Mistral 7B v0.1 · GQA 与 SWA','2310.06825'),gru:paper('GRU · 门控循环编码器—解码器','1406.1078'),
 transformer:paper('Transformer · 原论文','1706.03762'),bert:paper('BERT · 双向编码器','1810.04805'),t5:paper('T5 · 编码器—解码器','1910.10683'),llama:paper('Llama 3 · 技术报告','2407.21783'),
 mqa:paper('MQA · 共享 K/V','1911.02150'),gqa:paper('GQA · 分组共享 K/V','2305.13245'),mla:paper('DeepSeek-V2 · MLA / MoE','2405.04434'),v3:paper('DeepSeek-V3 · 架构与 MTP','2412.19437'),
 dsa:{label:'DeepSeek-V3.2 · §2 DSA、索引器训练与复杂度',url:'https://arxiv.org/html/2512.02556v1#S2'},dsaCode:{label:'DeepSeek-V3.2-Exp · 官方实现',url:'https://github.com/deepseek-ai/DeepSeek-V3.2-Exp'},
 v4:paper('DeepSeek-V4 · CSA / HCA','2606.19348'),v41:{label:'DeepSeek-V4.1-Flash · 官方模型卡（CED / CSA2）',url:'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash'},
 longformer:paper('Longformer · 局部与全局注意力','2004.05150'),bigbird:paper('BigBird · 局部、随机与全局连接','2007.14062'),longnet:paper('LongNet · 膨胀注意力','2307.02486'),
 nsa:paper('NSA · 三分支稀疏注意力','2502.11089'),moba:paper('MoBA · 块路由注意力','2502.13189'),msa:paper('MiniMax Sparse Attention · 块稀疏','2606.13392'),
 qwenNext:{label:'Qwen3-Next · 官方模型卡',url:'https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct'},qsa:{label:'Qwen3.8-Flash-Next · QSA、GR、N-gram 官方说明',url:'https://github.com/QwenLM/Qwen3.8-Flash-Next'},
 linear:paper('Linear Transformer · 因果递推','2006.16236'),performer:paper('Performer · 随机特征近似','2009.14794'),linformer:paper('Linformer · 序列低秩投影','2006.04768'),nystrom:paper('Nyströmformer · 地标近似','2102.03902'),reformer:paper('Reformer · LSH 与可逆层','2001.04451'),
 delta:paper('DeltaNet · 可并行的 delta rule','2406.06484'),gdn:paper('Gated DeltaNet · 遗忘与定向写入','2412.06464'),kda:{label:'Kimi Linear · §2–4 KDA 递推和混合架构',url:'https://arxiv.org/html/2510.26692v1#S3'},kimi:{label:'Kimi Linear · 官方模型说明',url:'https://github.com/MoonshotAI/Kimi-Linear'},gdn2:paper('Gated DeltaNet-2 · 解耦擦除与写入','2605.22791'),
 gla:paper('GLA · 数据依赖遗忘门','2312.06635'),retnet:paper('RetNet · 并行 / 递推 / 分块','2307.08621'),s4:paper('S4 · 结构化状态空间','2111.00396'),mamba:paper('Mamba · 选择性 SSM','2312.00752'),mamba2:paper('Mamba-2 · 状态空间对偶','2405.21060'),mamba3:paper('Mamba-3 · 状态更新、离散化与 MIMO','2603.15569'),rwkv:paper('RWKV-7 · 动态状态演化','2503.14456'),hyena:paper('Hyena · 隐式长卷积','2302.10866'),
 txl:paper('Transformer-XL · 跨片段记忆','1901.02860'),ttt:paper('TTT · 隐状态本身是可学习模型','2407.04620'),titans:paper('Titans · 测试时记忆','2501.00663'),
 moe:paper('Switch Transformer · 条件计算','2101.03961'),mixtral:paper('Mixtral · 稀疏专家','2401.04088'),swiglu:paper('GLU / SwiGLU · 门控 FFN','2002.05202'),engram:paper('Engram · 条件查表记忆','2601.07372'),
 resnet:paper('ResNet · 残差连接','1512.03385'),mhc:paper('mHC · 约束多分支残差','2512.24880'),norm:paper('RMSNorm · 均方根归一化','1910.07467'),rope:paper('RoPE · 旋转位置编码','2104.09864'),alibi:paper('ALiBi · 距离偏置','2108.12409'),gatedAttention:paper('Gated Attention · 注意力输出门','2505.06708'),
 vit:paper('ViT · 图像 patch 序列','2010.11929'),swin:paper('Swin · 分层移窗','2103.14030'),dino:{label:'DINOv3 · 官方模型与实现',url:'https://github.com/facebookresearch/dinov3'},clip:paper('CLIP · 图文对齐','2103.00020'),siglip:paper('SigLIP · 图文 sigmoid 目标','2303.15343'),perceiver:paper('Perceiver · 固定潜变量交叉注意力','2103.03206'),llava:paper('LLaVA · 视觉与语言接口','2304.08485'),
 unet:paper('U-Net · 多尺度与跳连','1505.04597'),ldm:paper('Latent Diffusion · 编码、生成与解码','2112.10752'),dit:paper('DiT · Transformer 生成骨干','2212.09748'),mmdit:paper('MMDiT / SD3 · 多模态生成结构','2403.03206'),llada:paper('LLaDA · 掩码扩散语言模型','2502.09992'),
 dreamer:paper('DreamerV3 · 潜在世界模型','2301.04104'),jepa:paper('V-JEPA 2 · 表示预测与规划','2506.09985'),openvla:paper('OpenVLA · 视觉语言动作结构','2406.09246'),pi0:paper('π0 · 动作专家与 Flow','2410.24164'),diffusionPolicy:paper('Diffusion Policy · 动作生成','2303.04137'),act:paper('ACT · 动作分块','2304.13705'),
 flash:paper('FlashAttention · 精确注意力的 IO 算法','2205.14135'),paged:paper('PagedAttention · KV 内存管理','2309.06180'),streaming:paper('StreamingLLM · sinks 与滑动缓存','2309.17453'),ut:paper('Universal Transformer · 深度方向复用','1807.03819'),trm:paper('TRM · 递归细化','2510.04871'),
};
