import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

function getStoredRole(): string {
    const stored = localStorage.getItem('userRole');
    if (stored) return stored;
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return '';
        const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '');
        const payload = JSON.parse(atob(b64));
        const claim = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        const map: Record<string, string> = {
            Manager: 'Manager', Coordinator: 'Coordinator',
            Dispatcher: 'Dispatcher', Encoder: 'Encoder', Courier: 'Courier', Accountant: 'Accountant'
        };
        return map[claim] || claim || '';
    } catch {
        return '';
    }
}

function isTokenValid(): boolean {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return false;
        const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '');
        const payload = JSON.parse(atob(b64));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('authToken');
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    if (!isTokenValid()) {
        return <Navigate to="/" replace />;
    }

    const role = getStoredRole();
    if (allowedRoles && !allowedRoles.some(r => r.toLowerCase() === role.toLowerCase())) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
