"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════
// ADDRESS INPUT — Google Places Autocomplete
// ═══════════════════════════════════════════════════

interface AddressValue {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  county: string;
  formatted: string; // full formatted address from Google
}

const EMPTY_ADDRESS: AddressValue = { street: "", street2: "", city: "", state: "", zip: "", country: "US", county: "", formatted: "" };

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia", PR: "Puerto Rico", GU: "Guam", VI: "US Virgin Islands",
};

interface AddressInputProps {
  value: AddressValue | string | null;
  onChange: (val: AddressValue) => void;
  fields?: string[]; // which fields to show
  required?: boolean;
  helpText?: string;
}

export function AddressInput({ value, onChange, fields, required, helpText }: AddressInputProps) {
  const addr: AddressValue = typeof value === "string"
    ? { ...EMPTY_ADDRESS, street: value }
    : value || { ...EMPTY_ADDRESS };

  const showFields = fields || ["street", "street2", "city", "state", "zip", "country"];
  const searchRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchText, setSearchText] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const update = (field: string, val: string) => {
    onChange({ ...addr, [field]: val });
  };

  // Google Places Autocomplete
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) { setSuggestions([]); return; }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      // No API key — just update street field
      update("street", input);
      return;
    }

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&key=${apiKey}`
      );
      const data = await res.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
        setShowSuggestions(true);
      }
    } catch {
      // Fallback: use Google's client-side autocomplete if available
      if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input, types: ["address"], componentRestrictions: { country: "us" } },
          (predictions: any[]) => {
            if (predictions) { setSuggestions(predictions); setShowSuggestions(true); }
          }
        );
      }
    }
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const selectSuggestion = async (suggestion: any) => {
    setShowSuggestions(false);
    setSearchText(suggestion.description || suggestion.structured_formatting?.main_text || "");

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey || !suggestion.place_id) {
      // Parse from description as fallback
      const parts = (suggestion.description || "").split(",").map((s: string) => s.trim());
      onChange({
        ...addr,
        street: parts[0] || "",
        city: parts[1] || "",
        state: parts[2]?.replace(/\s+\d{5}.*/, "") || "",
        zip: (parts[2]?.match(/\d{5}/) || [""])[0],
        country: "US",
        formatted: suggestion.description || "",
      });
      return;
    }

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=address_components,formatted_address&key=${apiKey}`
      );
      const data = await res.json();
      if (data.result) {
        const components = data.result.address_components || [];
        const get = (type: string) => components.find((c: any) => c.types.includes(type));

        onChange({
          street: `${get("street_number")?.long_name || ""} ${get("route")?.long_name || ""}`.trim(),
          street2: addr.street2,
          city: get("locality")?.long_name || get("sublocality_level_1")?.long_name || "",
          state: get("administrative_area_level_1")?.short_name || "",
          zip: get("postal_code")?.long_name || "",
          country: get("country")?.short_name || "US",
          county: get("administrative_area_level_2")?.long_name || "",
          formatted: data.result.formatted_address || "",
        });
      }
    } catch {
      // Fallback already handled above
    }
  };

  const ic = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

  return (
    <div className="space-y-2">
      {/* Autocomplete search */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">📍</span>
          <input
            ref={searchRef}
            value={searchText || addr.street}
            onChange={e => { handleSearchChange(e.target.value); update("street", e.target.value); }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className={`${ic} pl-2`}
            placeholder="Start typing an address..."
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={s.place_id || i}
                type="button"
                onMouseDown={() => selectSuggestion(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <span className="text-gray-900">{s.structured_formatting?.main_text || s.description}</span>
                {s.structured_formatting?.secondary_text && (
                  <span className="text-gray-400 ml-1 text-xs">{s.structured_formatting.secondary_text}</span>
                )}
              </button>
            ))}
            <div className="px-3 py-1.5 text-[9px] text-gray-300 bg-gray-50">Powered by Google</div>
          </div>
        )}
      </div>

      {/* Individual fields */}
      <div className="grid grid-cols-1 gap-2">
        {showFields.includes("street") && (
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Street address</label>
            <input value={addr.street} onChange={e => update("street", e.target.value)} className={ic} placeholder="123 Main St" />
          </div>
        )}
        {showFields.includes("street2") && (
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Apt, suite, unit <span className="text-gray-300">(optional)</span></label>
            <input value={addr.street2} onChange={e => update("street2", e.target.value)} className={ic} placeholder="Suite 100" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {showFields.includes("city") && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">City</label>
              <input value={addr.city} onChange={e => update("city", e.target.value)} className={ic} />
            </div>
          )}
          {showFields.includes("state") && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">State</label>
              <select value={addr.state} onChange={e => update("state", e.target.value)} className={ic}>
                <option value="">Select state</option>
                {Object.entries(US_STATES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {showFields.includes("zip") && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">ZIP code</label>
              <input value={addr.zip} onChange={e => update("zip", e.target.value)} className={ic} placeholder="10001" maxLength={10} />
            </div>
          )}
          {showFields.includes("country") && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Country</label>
              <input value={addr.country} onChange={e => update("country", e.target.value)} className={ic} placeholder="US" />
            </div>
          )}
        </div>
        {showFields.includes("county") && (
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">County</label>
            <input value={addr.county} onChange={e => update("county", e.target.value)} className={ic} />
          </div>
        )}
      </div>

      {helpText && <p className="text-xs text-gray-400">{helpText}</p>}
    </div>
  );
}

export type { AddressValue };
export { EMPTY_ADDRESS };
