"use client";

import { SelectField } from "./form-primitives";
import type { SupportedIndustry, SupportedOfferType } from "./types";
import {
  defaultOfferTypeByIndustry,
  industryPickerOptions,
  softwareOfferPickerOptions,
} from "./types";

type OfferTypePillsProps = {
  industry: SupportedIndustry;
  value: SupportedOfferType;
  onIndustryChange: (industry: SupportedIndustry) => void;
  onChange: (offerType: SupportedOfferType) => void;
};

const isSupportedOfferType = (
  value: (typeof softwareOfferPickerOptions)[number]["value"],
): value is SupportedOfferType =>
  value === "software_subscription" ||
  value === "software_paid_pilot" ||
  value === "software_token_pricing" ||
  value === "software_hybrid_platform_usage" ||
  value === "software_implementation_plus_subscription" ||
  value === "ecommerce_one_time_product" ||
  value === "ecommerce_repeat_purchase_product" ||
  value === "ecommerce_subscription_replenishment";

const OfferTypePills = ({
  industry,
  value,
  onIndustryChange,
  onChange,
}: OfferTypePillsProps) => {
  const activeIndustry = industryPickerOptions.find((option) => option.value === industry);
  const supportedIndustryOptions = industryPickerOptions.filter(
    (option): option is (typeof industryPickerOptions)[number] & {
      value: SupportedIndustry;
      status: "available";
    } => option.status === "available",
  );
  const stagedIndustryOptions = industryPickerOptions.filter(
    (option) => option.status === "staged",
  );
  const supportedOfferOptions = softwareOfferPickerOptions.filter(
    (option): option is (typeof softwareOfferPickerOptions)[number] & {
      value: SupportedOfferType;
      status: "supported";
      industry: SupportedIndustry;
    } =>
      option.status === "supported" &&
      option.industry === industry &&
      isSupportedOfferType(option.value),
  );
  const stagedOfferOptions = softwareOfferPickerOptions.filter(
    (option) => option.status === "staged" && option.industry === industry,
  );
  const activeOffer = supportedOfferOptions.find((option) => option.value === value);

  return (
    <div className="space-y-4 rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
          Industry setup
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {activeIndustry?.label ?? "Offer Model"}
        </h3>
        <p className="mt-2 text-sm text-white/56">
          Choose the industry first, then select the offer model that matches how
          this product monetizes.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            Industry
          </p>
          <SelectField
            value={industry}
            onChange={(event) =>
              onIndustryChange(event.target.value as SupportedIndustry)
            }
          >
            {supportedIndustryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          {stagedIndustryOptions.length > 0 ? (
            <details className="mt-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <summary className="cursor-pointer list-none text-sm text-white/60">
                Other industries
              </summary>
              <div className="mt-2 space-y-1 text-sm text-white/46">
                {stagedIndustryOptions.map((option) => (
                  <p key={option.value}>{option.label} · Coming next</p>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            {industry === "software_tech" ? "Software offer model" : "E-commerce offer model"}
          </p>
          <SelectField
            value={value}
            onChange={(event) => onChange(event.target.value as SupportedOfferType)}
          >
            {supportedOfferOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          {stagedOfferOptions.length > 0 ? (
            <details className="mt-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
              <summary className="cursor-pointer list-none text-sm text-white/60">
                Other offer models
              </summary>
              <div className="mt-2 space-y-1 text-sm text-white/46">
                {stagedOfferOptions.map((option) => (
                  <p key={option.value}>{option.label} · Coming later</p>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>

      {activeOffer ? (
        <div className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
          <p className="text-sm font-medium text-white">{activeOffer.label}</p>
          <p className="mt-1 text-sm leading-6 text-white/56">{activeOffer.summary}</p>
        </div>
      ) : null}
    </div>
  );
};

export const getDefaultOfferTypeForIndustry = (industry: SupportedIndustry) =>
  defaultOfferTypeByIndustry[industry];

export default OfferTypePills;
