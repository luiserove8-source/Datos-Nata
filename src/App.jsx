import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaActa from './pages/NuevaActa';
import VerActa from './pages/VerActa';
import AdminUsuarios from './pages/AdminUsuarios';
import AdminAuditoria from './pages/AdminAuditoria';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/actas/nueva" element={
            <ProtectedRoute>
              <Layout><NuevaActa /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/actas/:id" element={
            <ProtectedRoute>
              <Layout><VerActa /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin/usuarios" element={
            <AdminRoute>
              <Layout><AdminUsuarios /></Layout>
            </AdminRoute>
          } />

          <Route path="/admin/auditoria" element={
            <AdminRoute>
              <Layout><AdminAuditoria /></Layout>
            </AdminRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
