import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Latest selectable date (e.g. today for start dates) */
  toDate?: Date;
  /** Earliest selectable date */
  fromDate?: Date;
  /**
   * Earliest year shown in the year dropdown.
   * Defaults to 1960 — covers a full medical career.
   */
  fromYear?: number;
  /**
   * Latest year shown in the year dropdown.
   * Defaults to current year + 10 — covers revalidation / future dates.
   */
  toYear?: number;
};

function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  toDate,
  fromDate,
  fromYear = 1960,
  toYear = CURRENT_YEAR + 10,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);

  // Bounds for the dropdown range
  const startMonth = new Date(fromYear, 0, 1);
  const endMonth = new Date(toYear, 11, 31);

  function handleSelect(d: Date | undefined) {
    onChange(d ? format(d, "yyyy-MM-dd") : "");
    if (d) setOpen(false); // auto-close on pick
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "group h-10 w-full justify-start gap-2 text-left font-normal",
            "border-input hover:border-brand hover:bg-brand-soft/40 transition-colors",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="flex-1 truncate">
            {selected ? format(selected, "dd MMM yyyy") : placeholder}
          </span>
          {/* Clear button — only visible when a value is set */}
          {value && !disabled && (
            <span
              role="button"
              aria-label="Clear date"
              onClick={handleClear}
              className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 shadow-pop rounded-xl border-border overflow-hidden"
        align="start"
        sideOffset={6}
      >
        {/* Header strip */}
        <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {selected ? format(selected, "MMMM yyyy") : "Select a date"}
          </p>
          {selected && (
            <button
              type="button"
              onClick={() => {
                onChange("");
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={(d) => {
            if (toDate && d > toDate) return true;
            if (fromDate && d < fromDate) return true;
            return false;
          }}
          defaultMonth={selected ?? (toDate && toDate < new Date() ? toDate : undefined)}
          className="p-3"
        />

        {/* Footer hint */}
        <div className="border-t px-3 py-2 bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Use the month &amp; year dropdowns above to navigate quickly
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
