// 通用数组换位工具（条目上下移、模块拖拽排序等），均为原地修改

export const moveItem = (arr: unknown[], from: number, to: number): void => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length)
    return;
  const [it] = arr.splice(from, 1);
  arr.splice(to, 0, it);
};

export const moveInArray = <T>(arr: T[], i: number, dir: number): void => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
};
