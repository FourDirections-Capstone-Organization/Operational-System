interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function Select({ value, onChange, options, placeholder, className = '', disabled }: SelectProps) {
    return (
        <select
            className={`form-input filter-select ${className}`}
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}
