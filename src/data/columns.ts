export interface Column {
  title: string;
  slug: string;
  description: string;
  href: string;
  featured: boolean;
}

export const columns: Column[] = [
  {
    title: '帝系传承',
    slug: 'lineage',
    description: '整理中国历代帝王、宗室与皇位传承关系，以谱系与时间为线索呈现历史。',
    href: '/columns/lineage/',
    featured: true,
  },
  {
    title: 'AI',
    slug: 'ai',
    description: '记录人工智能、推荐系统、大语言模型与智能体相关的研究、实践与思考。',
    href: '/columns/ai/',
    featured: true,
  },
  {
    title: '阅读摘抄',
    slug: 'reading',
    description: '保存阅读中的摘录、批注与随想，也记录一些值得反复回看的文字。',
    href: '/columns/reading/',
    featured: true,
  },
];

export const columnSlugs = columns.map((column) => column.slug);
