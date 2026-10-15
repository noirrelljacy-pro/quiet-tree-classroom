import type { Phase } from './engine';
// A single Chinese copy catalog leaves room for future locale dictionaries.
export const phaseText: Record<Phase, [string, string]> = {
  idle: ['每一份安静，都在滋养小树', '开启麦克风，或先用演示模式试一试。'],
  growing: ['让安静，慢慢生长', '安静保持 2 秒后开始积累成长，短暂声音只会暂停成长。'],
  warning: ['轻一点，小树在听', '声音持续超过阈值 3 秒，放轻声音就能继续。'],
  wilting: ['给小树一点安静的时间', '声音超过了容忍时长，叶片慢慢下垂，成长进度会保留。'],
  recovering: ['谢谢你，小树正在恢复', '安静已保持 2 秒，叶片逐渐舒展；恢复后继续成长。'],
  fruit: ['我们一起，种出了小小果实', '每一份安静都有意义。休息一下，或开启下一轮。'],
};
