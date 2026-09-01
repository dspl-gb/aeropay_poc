import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsNationalPhoneInput } from "@/lib/phone";

type UsPhoneInputProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function UsPhoneInput({
  id = "phone",
  label = "Mobile number",
  value,
  onChange,
  required = false,
}: UsPhoneInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          value="+1"
          disabled
          aria-label="Country code"
          className="h-11 w-[4.25rem] shrink-0 rounded-xl text-center disabled:cursor-default disabled:opacity-100"
        />
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="555 123 4567"
          value={value}
          onChange={(e) => onChange(formatUsNationalPhoneInput(e.target.value))}
          maxLength={12}
          className="h-11 flex-1 rounded-xl"
          required={required}
        />
      </div>
    </div>
  );
}
