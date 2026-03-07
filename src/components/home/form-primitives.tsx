"use client";

import type { ChangeEvent, ReactNode } from "react";

export const fieldClassName = "input-shell px-3 py-2.5 text-base sm:text-sm";
export const panelClassName = "panel-subtle rounded-[22px] p-4";
export const pillClassName = "pill-action rounded-full px-3 py-1.5 text-sm";

export const FieldBlock = ({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <div className="field-block">
      <span className="text-[13px] font-medium tracking-[0.01em] text-white/82">
        {label}
      </span>
      {children}
      {helper ? <span className="text-xs text-white/54">{helper}</span> : null}
    </div>
  );
};

export const SelectField = ({
  name,
  value,
  onChange,
  children,
}: {
  name?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) => {
  return (
    <span className="select-shell">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={fieldClassName}
      >
        {children}
      </select>
    </span>
  );
};

export const ChoiceCard = ({
  checked,
  title,
  description,
  onSelect,
}: {
  checked: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) => {
  return (
    <button
      type="button"
      data-selected={checked}
      onClick={onSelect}
      className="choice-card flex w-full items-start gap-3 rounded-[18px] p-3 text-left"
    >
      <span className="choice-indicator mt-1 h-3.5 w-3.5 rounded-full" />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="block text-xs text-white/54">{description}</span>
      </span>
    </button>
  );
};

export const StatCard = ({
  eyebrow,
  value,
  caption,
}: {
  eyebrow: string;
  value: string;
  caption: string;
}) => {
  return (
    <div className="panel-subtle rounded-[22px] p-4">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">
          {eyebrow}
        </p>
        <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
        <p className="text-sm text-white/54">{caption}</p>
      </div>
    </div>
  );
};
