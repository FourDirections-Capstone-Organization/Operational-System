import { useAuthSync } from './useAuthSync';

export default function AuthSyncWatcher() {
    useAuthSync();
    return null; // renders nothing, just watches
}