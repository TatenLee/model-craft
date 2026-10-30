import {challenge as C} from './shared.js';
export default [
C(1,2,'给一批输入生成预测',{
 goal:'实现预测函数，输入多条样本，返回同样数量的预测。',signature:'predict(xs, w, b)',
 contract:'xs 是有限数字列表，w、b 是数字。返回列表 [w*x+b, ...]，保留输入顺序；空列表返回 []，不得修改输入。这里不进行训练。',
 context:'数据工程里常把记录批量送进模型。先把最简单的接口做对：一条输入对应一条预测，模型参数在整批样本间共享。否则后续损失可能把 A 样本的预测与 B 样本的标签比较，代码仍能运行，训练却失去意义。',
 steps:['建立一个新的输出列表，不要覆盖 xs；从第一条样本开始计算 w*x+b。','遍历每一条输入，把计算结果放进列表，最后 return 整个列表。','w 和 b 在循环中保持不变。改变输入是在推理；改变 w 是换一组参数。'],
 worked:['predict([1,2], 3, 1) 中，输入是 [1,2]，参数是 3 与 1。','第一项：3×1+1=4；第二项：3×2+1=7。','输出必须是 [4,7]，而不是只返回最后一项 7。'],
 mistake:'return 写在 for 循环内部会提前退出；只 print 会让调用者拿到 None；把 w 当成样本数量则混淆参数与数据。',
 transfer:'真实网络替换了 w*x+b 这条计算规则，但批量接口、输入输出对齐和参数共享仍然存在。这个函数没有损失和更新，不能称为训练器。',
 cases:[['predict([1,2],3,1)','[4,7]','两条样本共享参数'],['predict([-2,0,2],-1,0.5)','[2.5,0.5,-1.5]','负数和偏置'],['predict([],3,1)','[]','空批次'],['predict([9],0,2)','[2]','零权重只剩偏置']],
 extraTests:[{name:'保持原始数据',code:'xs=[2,3]\npredict(xs,4,1)\nassert xs==[2,3]'}],
 solution:'def predict(xs,w,b):\n    return [w*x+b for x in xs]\n',
 quiz:['predict([2],3,1) 的结果是什么？',['[7]','[6]','7'],0,'3×2+1=7；接口返回列表，所以是 [7]。']
}),
C(1,4,'完成一次参数更新',{
 goal:'计算整批样本的梯度，再同时更新 w、b。',signature:'train_step(xs, ys, w, b, lr)',
 contract:'xs、ys 是等长非空数字列表，lr≥0。返回 (new_w,new_b,loss_before)。误差 e=w*x+b-y，loss=平均 e²，dw=平均 2*e*x，db=平均 2*e。参数更新使用同一批旧参数。',
 context:'这里第一次让程序根据错误修改参数。你已经会算预测，但如果只是不断运行 predict，同一输入永远得到同一结果。训练多出的工作是：衡量错误、计算调整信号、执行更新。loss_before 明确指更新前，方便与手算核对。',
 steps:['先固定旧 w、b，计算所有误差；不要一边处理样本一边修改 w。','分别累计 e²、2*e*x、2*e，再各除以样本数。','返回 w-lr*dw、b-lr*db、平均平方误差。lr=0 时参数不动，但仍要报告真实误差。'],
 worked:['xs=[1],ys=[3],w=0,b=0：预测 0，误差 e=-3。','loss=9，dw=-6，db=-6。','lr=0.1 时 w_new=0.6、b_new=0.6；返回的 loss 仍是更新前的 9。'],
 mistake:'如果先更新 w 再重新计算 db，两项梯度就不再来自同一组参数。平方误差使用平方，方向信息则来自梯度，二者不能互换。',
 transfer:'PyTorch 的 backward 对复杂网络自动计算类似的梯度，optimizer.step 执行修改；本题手写最小链路，让这两个操作不再是黑箱。',
 cases:[['train_step([1],[3],0,0,0.1)','(0.6,0.6,9)','一条可手算样本'],['train_step([1,2],[3,6],0,0,0.1)','(1.5,0.9,22.5)','按 batch 平均'],['train_step([1],[3],3,0,1)','(3,0,0)','零误差'],['train_step([2],[6],1,0,0)','(1,0,16)','零学习率仍算损失']],
 solution:'def train_step(xs,ys,w,b,lr):\n    errors=[w*x+b-y for x,y in zip(xs,ys)]\n    n=len(xs)\n    dw=sum(2*e*x for e,x in zip(errors,xs))/n\n    db=sum(2*e for e in errors)/n\n    return w-lr*dw,b-lr*db,sum(e*e for e in errors)/n\n',
 quiz:['梯度是 -6，学习率为 0.1，旧参数为 0，更新后是多少？',['-0.6','0.6','6'],1,'0-0.1×(-6)=0.6。负梯度意味着沿正方向更新。']
}),
C(1,6,'写一个独立评测器',{
 goal:'在同一验证集上比较模型与常数基线。',signature:'evaluate(xs, ys, w, b, baseline)',
 contract:'xs、ys 等长非空。baseline 是仅从训练集确定的常数。本题返回 {"model_mse":数字,"baseline_mse":数字}，两个误差都按样本平均；函数不更新参数。',
 context:'训练 loss 下降只说明对已见数据拟合得更好。评测器接收另一批数据，比较当前模型与一个简单对手。先固定基线再看验证答案，可以防止把验证集均值偷偷当成基线的训练结果。',
 steps:['为每个验证输入计算 w*x+b，与对应目标做差。','对同一目标再计算 baseline-y，分别累计两组平方误差。','两个分母都用验证样本数，不让模型与基线使用不同评测集合。'],
 worked:['验证 xs=[1,2]、ys=[3,6]，模型 w=3,b=0，两个误差都是零。','常数 baseline=3 对应预测 [3,3]，平方误差 [0,9]。','model_mse=0，baseline_mse=4.5；这个结论只适用于本次验证数据。'],
 mistake:'验证时更新 w 会把评测变成继续训练；把误差直接相加可能正负抵消。',
 transfer:'真实项目也要先确定比较对象和协议。模型比常数好只是最低限度证据，还要分析不同曲目、场景和失败样例。',
 cases:[['evaluate([1,2],[3,6],3,0,3)','{"model_mse":0,"baseline_mse":4.5}','模型优于常数'],['evaluate([0],[2],0,0,2)','{"model_mse":4,"baseline_mse":0}','基线也可能更好'],['evaluate([-1,1],[-2,2],1,0,0)','{"model_mse":1,"baseline_mse":4}','误差不能抵消']],
 solution:'def evaluate(xs,ys,w,b,baseline):\n    n=len(xs)\n    return {"model_mse":sum((w*x+b-y)**2 for x,y in zip(xs,ys))/n,"baseline_mse":sum((baseline-y)**2 for y in ys)/n}\n',
 quiz:['两条样本的误差为 -2 和 2，MSE 是多少？',['0','2','4'],2,'平方后得到 4 和 4，平均为 4；不能先把误差平均再平方。']
}),
C(1,7,'周项目：训练并验收你的第一个模型',{
 goal:'完成从初始化、重复更新到独立评测的完整训练程序。',signature:'fit_and_evaluate(train_x, train_y, valid_x, valid_y, steps, lr)',
 contract:'训练和验证各为等长非空列表，steps 为非负整数。初始化 w=b=0，每次用训练集全批量平方损失梯度更新。返回 {"w":w,"b":b,"validation_mse":验证MSE}。验证集只能用于最后评测。',
 context:'本周的三个函数现在要连成一个系统。数据提供目标，结构决定表达能力，训练循环改变参数，验证数据检验更新是否有用。综合任务不会给出已经封装好的 train_step；你需要把推理和更新公式接起来。',
 steps:['建立 w=0,b=0。写一个循环重复 steps 次，每次从当前参数重新计算训练误差。','把 dw、db 都算完再同时更新。验证数据不得出现在这个循环里。','循环结束后在 valid_x 上推理，只返回指定字典。先过 steps=0 和 steps=1，再调试长训练。'],
 worked:['训练输入 [1]，目标 [3]，验证输入 [2]，目标 [6]，steps=1，lr=0.1。','一次更新后 w=b=0.6。验证预测 1.8，与 6 相差 -4.2。','验证 MSE=17.64；单个训练样本不能唯一确定一条直线，不能因为训练误差低就承诺泛化。'],
 mistake:'每轮重新把 w 设为零，会让多步训练等于一次训练。把 valid_y 放入更新循环会造成评测泄漏。',
 transfer:'你完成的是可检验的最小训练器；它不是大语言模型，却包含后续训练共享的核心链路。把结构换成网络后，数据切分、更新与验证的职责仍相同。',
 cases:[['fit_and_evaluate([1],[3],[2],[6],1,0.1)','{"w":0.6,"b":0.6,"validation_mse":17.64}','一次更新后独立评测'],['fit_and_evaluate([1],[3],[2],[6],0,0.1)','{"w":0,"b":0,"validation_mse":36}','零步不训练'],['fit_and_evaluate([-1,1],[-2,2],[-2,2],[-4,4],1,0.5)','{"w":2,"b":0,"validation_mse":0}','对称样本一步拟合']],
 extraTests:[{name:'长期收敛与验证标签不影响权重',code:'a=fit_and_evaluate([-1,0,1],[-1,1,3],[-2,2],[-3,5],100,0.1)\nb=fit_and_evaluate([-1,0,1],[-1,1,3],[-2,2],[99,99],100,0.1)\nassert a["validation_mse"]<1e-8, a\nassert a["w"]==b["w"] and a["b"]==b["b"], "验证标签影响了训练参数"'}],
 solution:'def fit_and_evaluate(train_x,train_y,valid_x,valid_y,steps,lr):\n    w=b=0.0\n    for _ in range(steps):\n        errors=[w*x+b-y for x,y in zip(train_x,train_y)]\n        dw=sum(2*e*x for e,x in zip(errors,train_x))/len(train_x)\n        db=2*sum(errors)/len(errors)\n        w,b=w-lr*dw,b-lr*db\n    return {"w":w,"b":b,"validation_mse":sum((w*x+b-y)**2 for x,y in zip(valid_x,valid_y))/len(valid_x)}\n',
 quiz:['只修改验证标签，重新运行同一训练配置，训练出的 w、b 应当怎样？',['保持一致','随验证标签变化','必定变成零'],0,'验证集不参与更新，因此只能改变评测结果。']
})];
