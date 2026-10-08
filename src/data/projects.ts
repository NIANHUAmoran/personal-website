export type ProjectLinkType = 'internal' | 'github' | 'external';

export interface Project {
  title: string;
  slug: string;
  description: string;
  type: string;
  tags: string[];
  pubDate?: string;
  featured: boolean;
  href: string;
  linkType: ProjectLinkType;
  column?: string;
}

export const projects: Project[] = [
  {
    title: '历代帝系与世系图谱',
    slug: 'lineage',
    description: '以谱系与君位传承为线索，整理并可视化中国历代帝王、宗室与诸侯世系。',
    type: '历史世系可视化',
    tags: ['帝系', '世系', '历史可视化'],
    featured: true,
    href: '/projects/lineage/',
    linkType: 'internal',
    column: 'lineage',
  },
];
