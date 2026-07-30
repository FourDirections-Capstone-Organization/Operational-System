import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

let _navigate: ((path: string) => void) | null = null;

/** Set the navigate reference from inside a React component */
export function setAppNavigate(navigate: (path: string) => void) {
    _navigate = navigate;
}

/**
 * Navigate to a path using React Router (client-side, no full reload).
 * Falls back to window.location.href if the React reference isn't set.
 */
export function appNavigate(path: string) {
    if (_navigate) {
        _navigate(path);
    } else {
        window.location.href = path;
    }
}

/**
 * React hook that registers the navigate function on mount.
 * Drop this into any component that lives inside <BrowserRouter>.
 */
export function useAppNavigate() {
    const navigate = useNavigate();
    useEffect(() => {
        setAppNavigate((path: string) => navigate(path, { replace: true }));
    }, [navigate]);
}
