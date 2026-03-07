export const percentInputValue = (value?: number) =>
  value == null ? "" : `${Number((value * 100).toFixed(2))}`;

export const percentText = (value?: number) =>
  value == null ? "-" : `${Number((value * 100).toFixed(2))}%`;

export const parsePercentInput = (value: string) => {
  if (value === "") {
    return undefined;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return undefined;
  }

  return numeric / 100;
};
