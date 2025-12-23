const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatMoney = (n: number | null) => {
  if (n == null) return "—";
  return usd.format(n);
};

export const formatPercent = (n: number | null) => {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
};

export const formatRatio = (n: number | null) => {
  if (n == null) return "—";
  return `${n.toFixed(2)}x`;
};

export const formatLabel = (label: string) => {
  return label.trim() === "" ? "—" : label;
};
