export const siteConfig = {
  siteName: '向雪怀川的个人主页',
  siteDescription: '记录技术、阅读、思考与生活。',
  author: '向雪怀川',
  siteUrl: 'https://chuanweizhang.cn',
  github: 'https://github.com/NIANHUAmoran',
  email: 'chuanweizhang@126.com',
  role: '独立开发者',
  avatar: '/images/avatar.jpg',
  heroImage: '/images/home-hero.webp',
  heroImageAlt: '背包少女站在高处，望向蓝色城市与天空中的飞鸟',
  profileSummary: '写技术，也写阅读与生活。',
  heroLine: 'Technology · Humanities · Reflection',
  heroIntro: '在技术与人文之间，记录正在形成的理解。',
} as const;

export const navigation = [
  { label: '首页', href: '/' },
  { label: '文章', href: '/blog/' },
  { label: '专栏', href: '/columns/' },
  { label: '项目', href: '/projects/' },
  { label: '关于', href: '/about/' }
] as const;
