"use client";

import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════
// PHONE INPUT — International with country flags
// ═══════════════════════════════════════════════════

interface PhoneValue {
  countryCode: string; // e.g., "US"
  dialCode: string; // e.g., "+1"
  number: string; // e.g., "5551234567"
  formatted: string; // e.g., "(555) 123-4567"
}

interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
  format: string; // e.g., "(###) ###-####"
  maxDigits: number;
}

// Top countries sorted by usage, then alphabetical
const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸", format: "(###) ###-####", maxDigits: 10 },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧", format: "#### ### ####", maxDigits: 11 },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", format: "(###) ###-####", maxDigits: 10 },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺", format: "#### ### ###", maxDigits: 9 },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", format: "#### #######", maxDigits: 11 },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", format: "## ## ## ## ##", maxDigits: 10 },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹", format: "### ### ####", maxDigits: 10 },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸", format: "### ## ## ##", maxDigits: 9 },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷", format: "(##) #####-####", maxDigits: 11 },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽", format: "## #### ####", maxDigits: 10 },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳", format: "#####-#####", maxDigits: 10 },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳", format: "### #### ####", maxDigits: 11 },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵", format: "##-####-####", maxDigits: 10 },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷", format: "###-####-####", maxDigits: 11 },
  { code: "RU", name: "Russia", dial: "+7", flag: "🇷🇺", format: "### ###-##-##", maxDigits: 10 },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦", format: "## ### ####", maxDigits: 9 },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬", format: "### ### ####", maxDigits: 10 },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬", format: "### ### ####", maxDigits: 10 },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪", format: "### ######", maxDigits: 9 },
  { code: "AE", name: "UAE", dial: "+971", flag: "🇦🇪", format: "## ### ####", maxDigits: 9 },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦", format: "## ### ####", maxDigits: 9 },
  { code: "IL", name: "Israel", dial: "+972", flag: "🇮🇱", format: "##-###-####", maxDigits: 9 },
  { code: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷", format: "### ### ## ##", maxDigits: 10 },
  { code: "PL", name: "Poland", dial: "+48", flag: "🇵🇱", format: "### ### ###", maxDigits: 9 },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱", format: "# ## ## ## ##", maxDigits: 9 },
  { code: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪", format: "##-### ## ##", maxDigits: 9 },
  { code: "NO", name: "Norway", dial: "+47", flag: "🇳🇴", format: "### ## ###", maxDigits: 8 },
  { code: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰", format: "## ## ## ##", maxDigits: 8 },
  { code: "FI", name: "Finland", dial: "+358", flag: "🇫🇮", format: "## ### ####", maxDigits: 9 },
  { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭", format: "## ### ## ##", maxDigits: 9 },
  { code: "AT", name: "Austria", dial: "+43", flag: "🇦🇹", format: "### #######", maxDigits: 10 },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪", format: "### ## ## ##", maxDigits: 9 },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹", format: "### ### ###", maxDigits: 9 },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪", format: "## ### ####", maxDigits: 9 },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿", format: "## ### ####", maxDigits: 9 },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬", format: "#### ####", maxDigits: 8 },
  { code: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰", format: "#### ####", maxDigits: 8 },
  { code: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼", format: "### ### ###", maxDigits: 9 },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭", format: "### ### ####", maxDigits: 10 },
  { code: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭", format: "## ### ####", maxDigits: 9 },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾", format: "##-### ####", maxDigits: 9 },
  { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩", format: "###-####-####", maxDigits: 11 },
  { code: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳", format: "### ### ####", maxDigits: 10 },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴", format: "### ### ####", maxDigits: 10 },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷", format: "## ####-####", maxDigits: 10 },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱", format: "# #### ####", maxDigits: 9 },
  { code: "PE", name: "Peru", dial: "+51", flag: "🇵🇪", format: "### ### ###", maxDigits: 9 },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭", format: "## ### ####", maxDigits: 9 },
];

function formatPhoneNumber(digits: string, format: string): string {
  let result = "";
  let digitIdx = 0;
  for (const char of format) {
    if (digitIdx >= digits.length) break;
    if (char === "#") {
      result += digits[digitIdx];
      digitIdx++;
    } else {
      result += char;
    }
  }
  // Append remaining digits if format is shorter
  if (digitIdx < digits.length) result += digits.slice(digitIdx);
  return result;
}

function stripNonDigits(s: string): string {
  return s.replace(/\D/g, "");
}

interface PhoneInputProps {
  value: PhoneValue | string | null;
  onChange: (val: PhoneValue) => void;
  required?: boolean;
  helpText?: string;
}

export function PhoneInput({ value, onChange, required, helpText }: PhoneInputProps) {
  // Parse incoming value
  const parseValue = (v: PhoneValue | string | null): { country: Country; digits: string } => {
    const defaultCountry = COUNTRIES[0]; // US
    if (!v) return { country: defaultCountry, digits: "" };
    if (typeof v === "string") {
      // Try to detect country from dial code
      const cleaned = v.replace(/\s/g, "");
      for (const c of COUNTRIES) {
        if (cleaned.startsWith(c.dial)) {
          return { country: c, digits: stripNonDigits(cleaned.slice(c.dial.length)) };
        }
      }
      return { country: defaultCountry, digits: stripNonDigits(v) };
    }
    const country = COUNTRIES.find(c => c.code === v.countryCode) || defaultCountry;
    return { country, digits: stripNonDigits(v.number) };
  };

  const parsed = parseValue(value);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [digits, setDigits] = useState(parsed.digits);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDigitsChange = (raw: string) => {
    const cleaned = stripNonDigits(raw).slice(0, country.maxDigits);
    setDigits(cleaned);
    const formatted = formatPhoneNumber(cleaned, country.format);
    onChange({
      countryCode: country.code,
      dialCode: country.dial,
      number: cleaned,
      formatted: `${country.dial} ${formatted}`,
    });
  };

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setShowDropdown(false);
    setSearch("");
    const formatted = formatPhoneNumber(digits.slice(0, c.maxDigits), c.format);
    onChange({
      countryCode: c.code,
      dialCode: c.dial,
      number: digits.slice(0, c.maxDigits),
      formatted: `${c.dial} ${formatted}`,
    });
    inputRef.current?.focus();
  };

  const filteredCountries = search
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search) || c.code.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES;

  const formatted = formatPhoneNumber(digits, country.format);

  return (
    <div className="space-y-1">
      <div className="flex" ref={dropdownRef}>
        {/* Country selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm h-full"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-gray-600 text-xs font-medium">{country.dial}</span>
            <span className="text-gray-400 text-[10px]">▾</span>
          </button>

          {showDropdown && (
            <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Search countries..."
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredCountries.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${c.code === country.code ? "bg-blue-50 font-medium" : ""}`}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1 truncate text-gray-900">{c.name}</span>
                    <span className="text-gray-400 text-xs font-mono">{c.dial}</span>
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <p className="px-3 py-4 text-sm text-gray-400 text-center">No countries found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone number input */}
        <input
          ref={inputRef}
          value={formatted}
          onChange={e => handleDigitsChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder={country.format.replace(/#/g, "0")}
          type="tel"
          maxLength={country.format.length + 5} // Allow some extra for typing
        />
      </div>

      {helpText && <p className="text-xs text-gray-400">{helpText}</p>}

      {/* Digit count indicator */}
      {digits.length > 0 && (
        <p className={`text-[10px] ${digits.length === country.maxDigits ? "text-green-500" : digits.length > country.maxDigits ? "text-red-500" : "text-gray-300"}`}>
          {digits.length}/{country.maxDigits} digits
        </p>
      )}
    </div>
  );
}

export type { PhoneValue };
export { COUNTRIES };
