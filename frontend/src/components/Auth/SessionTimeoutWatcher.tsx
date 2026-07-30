import { useSessionTimeout } from './useSessionTimeout';
import { useAppNavigate } from './useAppNavigate';

export default function SessionTimeoutWatcher() {
    useAppNavigate();
    useSessionTimeout();
    return null;
}
