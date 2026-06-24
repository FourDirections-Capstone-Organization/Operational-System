import { Search } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search…', className = '' }: SearchBarProps) {
    return (
        <div className={`form-input-icon ${className}`} style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} className="icon-left" />
            <input
                type="text"
                className="form-input"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ paddingLeft: 36 }}
            />
        </div>
    );
}
