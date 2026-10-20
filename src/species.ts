export const SPECIES = [
  {
    id: 'camphor',
    name: '香樟',
    subtitle: '把第一份安静，种成常绿',
    description: '圆润的绿叶，温柔而蓬勃。',
    colors: ['#b9ce87', '#7ea46b', '#8fb371', '#507e55', '#6d975b', '#38694d'],
    fruit: ['#f2cb75', '#d69a49'],
  },
  {
    id: 'maple',
    name: '枫树',
    subtitle: '收藏一树温暖的秋色',
    description: '掌状的枫叶，披上橘红秋光。',
    colors: ['#f4bc78', '#d77b4f', '#e8a064', '#b9513f', '#cc7655', '#8f443a'],
    fruit: ['#dfb97a', '#a87848'],
  },
  {
    id: 'cherry',
    name: '樱花',
    subtitle: '让专注，开成轻柔的花',
    description: '舒展的花冠，藏着粉白花朵。',
    colors: ['#ffe6e5', '#e8b2bd', '#f6c8d1', '#cc8f9e', '#e3aaba', '#b9798d'],
    fruit: ['#e5998b', '#bb5d63'],
  },
  {
    id: 'ginkgo',
    name: '银杏',
    subtitle: '一把小扇，接住金色时光',
    description: '扇形的金叶，安静地向光生长。',
    colors: ['#f5df8a', '#d6b453', '#e9ca68', '#b99a3d', '#cfb45f', '#9d8a3f'],
    fruit: ['#edcc73', '#cb9c47'],
  },
  {
    id: 'pine',
    name: '松树',
    subtitle: '慢慢长成，坚定的模样',
    description: '层叠的针叶，守护一片青绿。',
    colors: ['#a8c4a6', '#6f977d', '#7da68a', '#3e755e', '#588d73', '#2e5d4d'],
    fruit: ['#bb9469', '#806247'],
  },
] as const;
export type SpeciesId = (typeof SPECIES)[number]['id'];
export const DEFAULT_SPECIES: SpeciesId = 'camphor';
export function isSpecies(value: unknown): value is SpeciesId {
  return SPECIES.some((s) => s.id === value);
}
export function speciesById(id: SpeciesId) {
  return SPECIES.find((s) => s.id === id)!;
}
