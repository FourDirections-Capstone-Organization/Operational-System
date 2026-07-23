import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAuthSync() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            // Token was removed (logout from another tab)
            if (e.key === 'authToken' && e.newValue === null) {
                navigate('/', { replace: true });
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [navigate]);
}