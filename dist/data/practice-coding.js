import {challenge} from './practice/shared.js';
export const practiceCoding=[{...challenge(1,1,'给真实分类器补上每类召回率',{
 goal:'从混淆矩阵发现被总体准确率掩盖的失败，并把函数接入真实训练报告。',
 signature:'class_recall(matrix)',
 contract:'matrix 是非空的 N×N 列表，行是真实类别，列是预测类别；元素是非负整数（不接受 bool）。返回 N 个召回率，支持数为零的类返回 None。非法输入抛 ValueError，不修改原矩阵。',
 steps:['检查方阵形状及每个计数为非负整数。','对第 i 类，支持数是第 i 行的和，预测正确数是 matrix[i][i]。','支持数大于零时返回 对角值/行和，否则返回 None。'],
 context:'如果猫只认对一半，其他常见类别表现很好，总体准确率仍可能很高。你需要知道每个真实类别有多少被正确找回。',
 worked:'[[3,1,0],[1,1,0],[0,0,0]] → [0.75,0.5,None]。第一类真实出现 4 次，其中 3 次判对；第三类没出现在验证集，无法估计召回率。',
 mistake:'按列求和得到的是另一个分母，对应 precision。把没有样本的类记成 1 会虚构完美效果，记成 0 也会混淆“没测到”和“全错”。',
 transfer:'将函数复制到 projects/real-vision/train.py，传入 confusion.tolist()，在 evaluate 返回值中增加 per_class_recall；重新评估固定 checkpoint，确认新增指标不改变模型预测。函数测试通过不代表模型已经训练有效。',
 cases:[['class_recall([[3,1,0],[1,1,0],[0,0,0]])','[0.75,0.5,None]','正常与缺失类别'],['class_recall([[1,3],[0,2]])','[0.25,1.0]','行列不同的反例'],['class_recall([[0]])','[None]','空支持'],['class_recall([[7]])','[1.0]','单类正确'],['class_recall([[0,2],[3,0]])','[0.0,0.0]','全部错误']],
 extraTests:[{name:'拒绝无效计数与形状；不修改输入',code:'m=[[1,3],[0,2]]\nclass_recall(m)\nassert m==[[1,3],[0,2]]\nfor bad in [[],[[]],[[1,2]],[[1],[2,3]],[[True]],[[1.5]],[[-1]],[[float("nan")]],None]:\n    try: class_recall(bad)\n    except ValueError: pass\n    else: raise AssertionError("invalid confusion accepted")'}],
 solution:'def class_recall(matrix):\n    if not isinstance(matrix,list) or not matrix:\n        raise ValueError("nonempty matrix required")\n    n=len(matrix)\n    if any(not isinstance(row,list) or len(row)!=n for row in matrix):\n        raise ValueError("square matrix required")\n    if any(type(x) is not int or x<0 for row in matrix for x in row):\n        raise ValueError("nonnegative integer counts required")\n    return [row[i]/sum(row) if sum(row) else None for i,row in enumerate(matrix)]\n'
}),id:'practice-class-recall',day:null,level:'真实项目 Coding',minutes:30}];
