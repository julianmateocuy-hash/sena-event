import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { RequireRole } from "@/auth/RequireRole";
import { ToastProvider } from "@/components/Toast";
import { PageTransition } from "@/components/PageTransition";

import PublicRegister from "@/pages/PublicRegister";
import RegistrationSuccess from "@/pages/RegistrationSuccess";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import ScannerPage from "@/scanner/ScannerPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminAttendees from "@/pages/admin/AdminAttendees";
import AdminDelegates from "@/pages/admin/AdminDelegates";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminReports from "@/pages/admin/AdminReports";
import AdminAttendeeProfile from "@/pages/admin/AdminAttendeeProfile";
import AdminSettings from "@/pages/admin/AdminSettings";

function withTransition(element: JSX.Element) {
  return <PageTransition>{element}</PageTransition>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={withTransition(<Login />)} />
            <Route path="/reset-password" element={withTransition(<ResetPassword />)} />

            {/* Público — sin autenticación */}
            <Route path="/evento/:slug/registro" element={withTransition(<PublicRegister />)} />
            <Route path="/registro/exito" element={withTransition(<RegistrationSuccess />)} />

            {/* Delegado */}
            <Route
              path="/scanner"
              element={
                <RequireRole roles={["delegate", "event_admin", "super_admin"]}>
                  <ScannerPage />
                </RequireRole>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <RequireRole roles={["super_admin", "event_admin"]}>
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route index element={withTransition(<AdminDashboard />)} />
              <Route path="eventos" element={withTransition(<AdminEvents />)} />
              <Route path="asistentes" element={withTransition(<AdminAttendees />)} />
              <Route path="asistentes/:id" element={withTransition(<AdminAttendeeProfile />)} />
              <Route path="delegados" element={withTransition(<AdminDelegates />)} />
              <Route path="reportes" element={withTransition(<AdminReports />)} />
              <Route path="configuracion" element={withTransition(<AdminSettings />)} />
              <Route
                path="usuarios"
                element={
                  <RequireRole roles={["super_admin"]}>
                    <AdminUsers />
                  </RequireRole>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
