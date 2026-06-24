import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

function getTokenPayload(): { role?: string; exp?: number } | null {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));

        if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('authToken');
            return null;
        }

        // ✅ Read the full Microsoft claim key
        const role =
            payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

        return { ...payload, role };
    } catch (error) {

        return null;
    }
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const payload = getTokenPayload();

    if (!payload) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(payload.role ?? '')) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}