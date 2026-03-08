"use client";

import { SelectField } from "./form-primitives";
import type { SupportedSoftwareOfferType } from "./types";
import { industryPickerOptions, softwareOfferPickerOptions } from "./types";

type OfferTypePillsProps = {
  value: SupportedSoftwareOfferType;
  onChange: (offerType: SupportedSoftwareOfferType) => void;
};

const OfferTypePills = ({ value, onChange }: OfferTypePillsProps) => {
  const supported = softwareOfferPickerOptions.filter(
    (option) => option.status === "supported",
  );
  const staged = softwareOfferPickerOptions.filter(
    (option) => option.status === "staged",
  );
  const activeIndustry = industryPickerOptions[0]?.value ?? "software_tech";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
            Industry setup
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Software Offer Model
          </h3>
          <p className="mt-2 text-sm text-white/56">
            Pick the monetization shape first. The inputs below adapt to the offer
            you actually sell.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            Industry
          </p>
          <SelectField value={activeIndustry} onChange={() => undefined}>
            {industryPickerOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.status === "staged"}
              >
                {option.status === "available"
                  ? option.label
                  : `${option.label} (next)`}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {supported.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value as SupportedSoftwareOfferType)}
              className={`rounded-[22px] border p-4 text-left transition ${
                active
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.03] text-white hover:border-white/22 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{option.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                    active
                      ? "bg-black/10 text-black/72"
                      : "border border-white/12 bg-white/[0.03] text-white/46"
                  }`}
                >
                  Ready
                </span>
              </div>
              <p
                className={`mt-2 text-sm leading-6 ${
                  active ? "text-black/72" : "text-white/60"
                }`}
              >
                {option.summary}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
          Staged next
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {industryPickerOptions
            .filter((option) => option.status === "staged")
            .map((option) => (
              <div
                key={option.value}
                className="rounded-[18px] border border-white/8 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white/62">
                    {option.label}
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Industry next
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/42">
                  Industry-specific offer templates and onboarding will be added
                  after the software path is stable.
                </p>
              </div>
            ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {staged.map((option) => (
            <div
              key={option.value}
              className="rounded-[18px] border border-white/8 bg-black/20 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white/62">
                  {option.label}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/34">
                  Later
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/42">
                {option.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfferTypePills;
