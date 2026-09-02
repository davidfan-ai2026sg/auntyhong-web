"use client";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  className?: string;
  /** Larger tap targets for product page */
  size?: "sm" | "md";
};

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  className = "",
  size = "md",
}: Props) {
  const btn =
    size === "sm"
      ? "h-9 w-9 text-lg"
      : "h-11 w-11 text-xl";
  const input =
    size === "sm"
      ? "h-9 w-12 text-sm"
      : "h-11 w-14 text-base";

  function clamp(n: number) {
    let next = Number.isFinite(n) ? Math.floor(n) : min;
    if (next < min) next = min;
    if (max != null && next > max) next = max;
    return next;
  }

  return (
    <div
      className={`inline-flex items-stretch border border-sand bg-parchment ${className}`}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className={`${btn} border-r border-sand text-cocoa disabled:opacity-30`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label="Quantity"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return;
          onChange(clamp(Number(raw)));
        }}
        onBlur={(e) => {
          if (e.target.value === "" || !Number.isFinite(Number(e.target.value))) {
            onChange(min);
          }
        }}
        className={`${input} border-0 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={max != null && value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className={`${btn} border-l border-sand text-cocoa disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}
