type ResultLabelInput = {
  offerType?: string | null;
};

const oneTimeOfferTypes = new Set([
  "software_paid_pilot",
  "ecommerce_one_time_product",
]);

const recurringOfferTypes = new Set([
  "subscription",
  "software_subscription",
  "software_token_pricing",
  "software_hybrid_platform_usage",
  "ecommerce_subscription_replenishment",
]);

export const getRevenueDriverLabel = (input?: ResultLabelInput | null) => {
  switch (input?.offerType) {
    case "software_paid_pilot":
      return "Pilot fee / new customer";
    case "ecommerce_one_time_product":
      return "AOV / new customer";
    case "ecommerce_repeat_purchase_product":
      return "Net order revenue";
    case "software_implementation_plus_subscription":
      return "Recurring ARPC";
    default:
      return recurringOfferTypes.has(input?.offerType ?? "") ? "ARPC" : "Revenue driver";
  }
};

export const getLtvLabel = (input?: ResultLabelInput | null) => {
  switch (input?.offerType) {
    case "software_paid_pilot":
    case "ecommerce_one_time_product":
      return "Revenue / new customer";
    case "ecommerce_repeat_purchase_product":
      return "Revenue / customer lifetime";
    case "software_implementation_plus_subscription":
      return "Total LTV";
    default:
      return "LTV";
  }
};

export const getUnitEconomicsDescription = (input?: ResultLabelInput | null) => {
  if (input?.offerType === "software_implementation_plus_subscription") {
    return "Recurring customer economics plus the upfront implementation contribution.";
  }
  if (input?.offerType === "ecommerce_repeat_purchase_product") {
    return "Order-level revenue plus expected lifetime repeat-purchase economics.";
  }
  if (input?.offerType != null && oneTimeOfferTypes.has(input.offerType)) {
    return "One-time revenue and gross profit per newly acquired customer.";
  }
  return "Recurring per-customer and per-period economics for the current offer.";
};

export const getTrendRevenueLabel = () => "Revenue driver";
