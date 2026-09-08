export const format = (n: number) =>
  n >= 1e8
    ? `${(n / 1e8).toFixed(2)}亿`
    : n >= 1e4
      ? `${(n / 1e4).toFixed(2)}万`
      : Math.floor(n).toLocaleString("zh-CN");
