"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type Hit = {
  label: string;
  postal: string;
  blk: string;
  road: string;
  building: string;
};

function composeAddress(hit: Hit, unit: string) {
  const unitPart = unit.trim() ? ` #${unit.trim().replace(/^#/, "")}` : "";
  // Prefer structured line: Blk Road Building #unit Singapore POSTAL
  const bits: string[] = [];
  if (hit.blk) bits.push(hit.blk);
  if (hit.road) bits.push(hit.road);
  if (hit.building) bits.push(hit.building);
  let line = bits.length ? bits.join(" ") : hit.label.replace(/\s+SINGAPORE\s+\d{6}\s*$/i, "").trim();
  line = `${line}${unitPart}`.trim();
  if (hit.postal) line = `${line}, Singapore ${hit.postal}`;
  return line;
}

export function SgAddressFields() {
  const listId = useId();
  const [postal, setPostal] = useState("");
  const [unit, setUnit] = useState("");
  const [query, setQuery] = useState("");
  const [address, setAddress] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [looking, setLooking] = useState(false);
  const picked = useRef<Hit | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLooking(true);
    try {
      const res = await fetch(`/api/onemap/search?q=${encodeURIComponent(q)}`, {
        signal: ac.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { results?: Hit[] };
      if (ac.signal.aborted) return [];
      const results = data.results || [];
      setHits(results);
      return results;
    } catch {
      if (!ac.signal.aborted) setHits([]);
      return [];
    } finally {
      if (!ac.signal.aborted) setLooking(false);
    }
  }, []);

  // Autocomplete while typing street / building (skip pure 6-digit postal — handled separately)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || /^\d{6}$/.test(q)) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      const results = await search(q);
      setOpen(results.length > 0);
    }, 280);
    return () => clearTimeout(t);
  }, [query, search]);

  async function onPostalChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setPostal(digits);
    setStatus("");
    if (digits.length !== 6) return;
    setStatus("Looking up…");
    const results = await search(digits);
    const hit = results.find((r) => r.postal === digits) || results[0];
    if (!hit) {
      setStatus("No address found for this postal code. Please type it below.");
      setOpen(false);
      return;
    }
    picked.current = hit;
    const composed = composeAddress(hit, unit);
    setAddress(composed);
    setQuery(hit.label);
    setOpen(false);
    setStatus("Address filled from postal code. Add unit/floor if needed.");
  }

  function applyHit(hit: Hit) {
    picked.current = hit;
    if (hit.postal) setPostal(hit.postal);
    setQuery(hit.label);
    setAddress(composeAddress(hit, unit));
    setOpen(false);
    setHits([]);
    setStatus("Address selected. Add unit/floor if needed.");
  }

  function onUnitChange(raw: string) {
    setUnit(raw);
    if (picked.current) {
      setAddress(composeAddress(picked.current, raw));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm">
          Postal code
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="6 digits"
            value={postal}
            onChange={(e) => void onPostalChange(e.target.value)}
            className="mt-1 w-full border border-sand bg-parchment px-3 py-2 tracking-wider"
            maxLength={6}
            required
          />
        </label>
        <label className="block text-sm">
          Unit / floor (optional)
          <input
            placeholder="e.g. 01-42"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="mt-1 w-full border border-sand bg-parchment px-3 py-2"
            autoComplete="address-line2"
          />
        </label>
      </div>

      <div className="relative">
        <label className="block text-sm">
          Search address
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setStatus("");
              picked.current = null;
            }}
            onFocus={() => {
              if (hits.length) setOpen(true);
            }}
            onBlur={() => {
              // delay so click on suggestion registers
              setTimeout(() => setOpen(false), 180);
            }}
            placeholder="Building, street, or postal code"
            className="mt-1 w-full border border-sand bg-parchment px-3 py-2"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
          />
        </label>
        {open && hits.length ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-sand bg-parchment shadow-md"
          >
            {hits.map((h) => (
              <li key={`${h.label}-${h.postal}`}>
                <button
                  type="button"
                  role="option"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-sand/40"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHit(h)}
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {looking ? <p className="mt-1 text-xs text-cocoa/50">Searching…</p> : null}
      </div>

      <label className="block text-sm">
        Delivery address
        <textarea
          name="address"
          rows={3}
          required
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            picked.current = null;
          }}
          placeholder="Filled from postal code or search — you can edit"
          className="mt-1 w-full border border-sand bg-parchment px-3 py-2"
          autoComplete="street-address"
        />
      </label>
      {status ? <p className="text-sm text-cocoa/70">{status}</p> : null}
      <p className="text-xs text-cocoa/50">Address lookup via OneMap (Singapore).</p>
    </div>
  );
}
