export const ecommerceOfferTypes = [
  "ecommerce_one_time_product",
  "ecommerce_repeat_purchase_product",
  "ecommerce_subscription_replenishment",
  "ecommerce_bundle_offer",
] as const;

export type EcommerceOfferType = (typeof ecommerceOfferTypes)[number];

export const ecommerceMonetizationModels = [
  "one_time_product",
  "repeat_purchase",
  "subscription_replenishment",
  "bundle_offer",
] as const;

export type EcommerceMonetizationModel =
  (typeof ecommerceMonetizationModels)[number];

export type EcommerceMerchandisingModel =
  | "single_sku"
  | "catalog"
  | "bundle";

export type EcommerceFulfillmentModel =
  | "in_house"
  | "3pl"
  | "dropship"
  | "digital_goods";

export type EcommerceConfig = {
  industryPreset: "ecommerce";
  monetizationModel: EcommerceMonetizationModel;
  merchandisingModel?: EcommerceMerchandisingModel;
  fulfillmentModel?: EcommerceFulfillmentModel;
  notes?: string;
};
