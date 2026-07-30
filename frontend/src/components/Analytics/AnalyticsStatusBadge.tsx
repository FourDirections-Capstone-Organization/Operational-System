import { AnalyticsHealthStatus } from '../../services/analyticsService';
import './AnalyticsStatusBadge.css';

interface Props {
    status: AnalyticsHealthStatus;
}

const STATUS_LABELS: Record<AnalyticsHealthStatus, string> = {
    loading: 'Connecting...',
    online: 'Analytics Live',
    offline: 'Analytics Offline',
    error: 'Analytics Error',
};

export default function AnalyticsStatusBadge({ status }: Props) {
    return (
        <span className={`asb-root asb-${status}`}>
            <span className="asb-dot" />
            {STATUS_LABELS[status]}
        </span>
    );
}
