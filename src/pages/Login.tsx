/**
 * Login page — Integrated Enterprise Authentication (MAHA-AGRI Platform)
 * Incorporates Mobile Number + Password V1 Login, Multi-Role Selection,
 * Forced First-Login Password Change, and Decoupled OTP Password Reset.
 */

import { MahaAgriAuthProvider } from '../modules/auth/context/MahaAgriAuthContext';
import { AuthPage } from '../modules/auth/pages/AuthPage';

export default function Login() {
  return (
    <MahaAgriAuthProvider>
      <AuthPage />
    </MahaAgriAuthProvider>
  );
}
