import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './index.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import axios from 'axios'

axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

import LoginPage from './Pages/login_page/login'
import SystemAdmin_Dashboard from './Pages/SystemAdmin_Dashboard/SystemAdmin_Dashboard'
import ForgotPasswordPage from './Pages/forgotpassword_page/forgotpassword_page'
import ResetPasswordPage from './Pages/resetpassword_page/resetpassword_page'
import OpAdmin_Dashboard from './Pages/OpAdmin_Dashboard/OpAdmin_Dashboard'
import OpEmployee_Dashboard from './Pages/OpEmployee_Dashboard/OpEmployee_Dashboard'
import AccountLocked from './Pages/account_locked/account_locked'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import ChangePassword from './Pages/change_password/change_password'
import EmailVerificationPage from './Pages/email_verification_page/email_verification_page'
import ApplicantVerifyEmail from './Pages/applicant_verify_email/applicant_verify_email'
import SetPasswordPage from './Pages/set_password_page/set_password_page'
import { ToastProvider } from './components/Toast/Toast'
import AuthSyncWatcher from './components/Auth/AuthSyncWatcher'
import OnboardingPage from './Pages/onboarding_page/onboarding_page'
import PublicApplicationPortal from './Pages/public_application_portal/public_application_portal'

function PasswordChangedGuard() {
    const isPasswordChanged = localStorage.getItem('isPasswordChanged') === 'true';
    if (!isPasswordChanged) {
        const employeeId = localStorage.getItem('employeeId');
        if (employeeId === '0000') {
            return <Navigate to="/set-password" replace />;
        }
        return <Navigate to="/onboarding" replace />;
    }
    return <Outlet />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <ToastProvider>
                <AuthSyncWatcher />
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/forgotpassword_page" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/account_locked" element={<AccountLocked />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    <Route path="/set-password" element={<SetPasswordPage />} />
                    <Route path="/verify-email" element={<EmailVerificationPage />} />
                    <Route path="/applicant/verify-email" element={<ApplicantVerifyEmail />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/apply" element={<PublicApplicationPortal />} />

                    {/* System Admin routes */}
                    <Route element={<ProtectedRoute allowedRoles={['System Admin', 'SystemAdmin']} />}>
                        <Route element={<PasswordChangedGuard />}>
                            <Route path="/SystemAdmin_Dashboard" element={<SystemAdmin_Dashboard />} />
                        </Route>
                    </Route>

                    {/* Op Admin routes */}
                    <Route element={<ProtectedRoute allowedRoles={['Operation Admin', 'OperationAdmin']} />}>
                        <Route element={<PasswordChangedGuard />}>
                            <Route path="/OpAdmin_Dashboard" element={<OpAdmin_Dashboard />} />
                        </Route>
                    </Route>

                    {/* Op Employee routes */}
                    <Route element={<ProtectedRoute allowedRoles={['Coordinator', 'Encoder']} />}>
                        <Route element={<PasswordChangedGuard />}>
                            <Route path="/OpEmployee_Dashboard" element={<OpEmployee_Dashboard />} />
                        </Route>
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ToastProvider>
        </BrowserRouter>
    </React.StrictMode>
)