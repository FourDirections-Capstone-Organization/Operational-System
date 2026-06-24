import { AlertCircle } from 'lucide-react';

interface ErrorBannerProps {
    message: string;
    className?: string;
}

export default function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
    if (!message) return null;
    return (
        <div className={`form-api-error ${className}`}>
            <AlertCircle size={14} /><span>{message}</span>
        </div>
    );
}
