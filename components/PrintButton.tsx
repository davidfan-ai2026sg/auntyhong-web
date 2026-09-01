"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-cocoa px-5 py-2 text-sm text-parchment"
    >
      Print
    </button>
  );
}
