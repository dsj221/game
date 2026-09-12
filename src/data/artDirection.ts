/** Shared pigments for the painted timber miniature world. */
export const pigments = {
  wood: '#c47b32', woodLight: '#e4aa58', ink: '#623d28',
  tile: '#287f83', brick: '#b74e37', stone: '#87928f',
  paper: '#f0e2c7', soil: '#ad8054', water: '#63aaa8',
};
export const seasons = [
  { name: '春', ground: ['#9cac70', '#aabb7c', '#b6bc84', '#96a96d'], foliage: '#a5b85b', coat: ['#458b88', '#c58155', '#9ca75d', '#bf7781'] },
  { name: '夏', ground: ['#849b58', '#94a965', '#a6ad73', '#7f9759'], foliage: '#739b3e', coat: ['#e4d5af', '#69a3a0', '#b6b97b', '#cc9970'] },
  { name: '秋', ground: ['#b1a06a', '#c2ae7e', '#a99d69', '#bc9a64'], foliage: '#c88439', coat: ['#b46739', '#b99b55', '#68857f', '#985b50'] },
  { name: '冬', ground: ['#d8d6bd', '#e5dfcb', '#c8cbb8', '#dad8c7'], foliage: '#c9cbb8', coat: ['#8c4940', '#416e79', '#746049', '#8b6c7e'] },
] as const;
export const seasonIndex = (day: number) => Math.floor(Math.max(0, day - 1) / 14) % 4;
