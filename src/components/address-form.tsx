import type { DeliveryAddress } from '../types/food';

const FIELDS: Array<{ key: keyof DeliveryAddress; label: string; type: string; placeholder: string; span?: boolean }> = [
  { key: 'fullName', label: 'Full name', type: 'text', placeholder: 'Aarav Sharma' },
  { key: 'phone', label: 'Phone number', type: 'tel', placeholder: '98765 43210' },
  { key: 'line1', label: 'Flat / House no., Building', type: 'text', placeholder: 'Flat 402, Residency Green', span: true },
  { key: 'line2', label: 'Area, Street, Landmark', type: 'text', placeholder: 'Banjara Hills, Road No. 12', span: true },
  { key: 'city', label: 'City', type: 'text', placeholder: 'Hyderabad' },
  { key: 'pincode', label: 'Pincode', type: 'text', placeholder: '500034' },
];

export type AddressErrors = Partial<Record<keyof DeliveryAddress, string>>;

/** Client-side hints only — the server must validate the address again. */
export function validateAddress(values: DeliveryAddress): AddressErrors {
  const errors: AddressErrors = {};
  if (values.fullName.trim().length < 2) errors.fullName = 'Enter your full name';
  if (!/^[6-9]\d{9}$/.test(values.phone.replace(/\D/g, ''))) errors.phone = 'Enter a valid 10-digit mobile number';
  if (values.line1.trim().length < 4) errors.line1 = 'Enter the flat or house number';
  if (values.line2.trim().length < 4) errors.line2 = 'Enter the area or landmark';
  if (values.city.trim().length < 2) errors.city = 'Enter your city';
  if (!/^\d{6}$/.test(values.pincode.trim())) errors.pincode = 'Pincode must be 6 digits';
  return errors;
}

interface AddressFieldsProps {
  idPrefix: string;
  value: DeliveryAddress;
  errors: AddressErrors;
  onChange: (next: DeliveryAddress) => void;
  disabled?: boolean;
}

export function AddressFields({ idPrefix, value, errors, onChange, disabled = false }: AddressFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((field) => {
        const error = errors[field.key];
        const inputId = `${idPrefix}-${field.key}`;
        const errorId = `${inputId}-error`;

        return (
          <div key={field.key} className={field.span ? 'sm:col-span-2' : undefined}>
            <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700">
              {field.label}
            </label>
            <input
              id={inputId}
              name={field.key}
              type={field.type}
              inputMode={field.key === 'phone' || field.key === 'pincode' ? 'numeric' : undefined}
              autoComplete={field.key === 'fullName' ? 'name' : field.key === 'phone' ? 'tel' : 'street-address'}
              value={value[field.key]}
              disabled={disabled}
              placeholder={field.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
              className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition placeholder:text-neutral-400 focus:ring-2 disabled:bg-neutral-100 ${
                error
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25'
                  : 'border-neutral-300 focus:border-brand-500 focus:ring-brand-500/25'
              }`}
            />
            {error && (
              <p id={errorId} className="mt-1 text-xs font-medium text-rose-600">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
