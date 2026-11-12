"use client";

import { usePreferences } from "@/lib/preferences/Preferences";
import * as React from "react";
import { ChevronDown, Globe } from "lucide-react";
import type { Country } from "react-phone-number-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CountryOption = {
  value?: Country;
  label: string;
  divider?: boolean;
};

type IconComponentProps = {
  country?: Country;
  label: string;
  aspectRatio?: number;
  "aria-hidden"?: boolean;
};

type PhoneCountrySelectProps = {
  value?: Country;
  onChange: (country?: Country) => void;
  options: CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  iconComponent?: React.ComponentType<IconComponentProps>;
  className?: string;
  name?: string;
  "aria-label"?: string;
};

export function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  onFocus,
  onBlur,
  iconComponent: Icon,
  className,
  name,
  "aria-label": ariaLabel,
}: PhoneCountrySelectProps) {
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const isDisabled = disabled || readOnly;

  const selectedOption = React.useMemo(
    () =>
      options.find((option) => !option.divider && option.value === value),
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return options.filter((option) => {
      if (option.divider) return false;
      if (!query) return true;
      return option.label.toLowerCase().includes(query);
    });
  }, [options, search]);

  const handleSelect = (country?: Country) => {
    onChange(country);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={cn("PhoneInputCountry", className)}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isDisabled) {
            setOpen(nextOpen);
            if (!nextOpen) setSearch("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            name={name}
            aria-label={ariaLabel ?? t("Seleccionar país")}
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={isDisabled}
            onFocus={onFocus}
            onBlur={onBlur}
            className={cn(
              "flex h-full items-center gap-1 rounded-sm px-1 py-0.5 outline-none transition-colors",
              "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50",
              isDisabled && "pointer-events-none opacity-50",
            )}
          >
            {value && Icon ? (
              <Icon
                aria-hidden
                country={value}
                label={selectedOption?.label ?? value}
              />
            ) : (
              <span
                className="flex size-5 items-center justify-center text-muted-foreground"
                aria-hidden
              >
                <Globe className="size-4" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-72 p-2"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.setTimeout(() => searchInputRef.current?.focus(), 0);
          }}
        >
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Buscar país...")}
            className="h-12"
            autoComplete="off"
          />
          <ul
            className="mt-2 max-h-52 overflow-y-auto"
            role="listbox"
            aria-label={t("Países")}
          >
            {filteredOptions.length === 0 ? (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                {t("\r\n                Sin resultados\r\n              ")}
              </li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value ?? "international"}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                      option.value === value && "bg-muted font-medium",
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
