import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ClubForm from './pages/ClubForm';
import ClubOverviewPage from './pages/ClubOverviewPage';
import MemberForm from './pages/MemberForm';
import AdminPage from './pages/AdminPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import './App.css';

const AppContent = () => {
  const { isAuthenticated, user } = useAuth();

  // Redirect Member Admin to their club overview on login
  if (isAuthenticated && user?.adminType === 'Member Admin') {
    return (
      <>
        <Header />
        <Routes>
          <Route path="/club-overview" element={<ClubOverviewPage />} />
          <Route path="/member/add" element={<MemberForm />} />
          <Route path="/member/edit/:id" element={<MemberForm isEdit />} />
          <Route path="/club/edit/:id" element={<ClubForm isEdit />} />
          <Route path="*" element={<Navigate to="/club-overview" />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      {isAuthenticated && <Header />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={isAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />} />
        
        {/* Home Page - System Admin and Club Admin only */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute requiredRoles={['System Admin', 'Club Admin']}>
              <HomePage />
            </ProtectedRoute>
          } 
        />

        {/* Club Management Pages */}
        <Route 
          path="/club/add" 
          element={
            <ProtectedRoute requiredRoles={['System Admin', 'Club Admin']}>
              <ClubForm />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/club/edit/:id" 
          element={
            <ProtectedRoute requiredRoles={['System Admin', 'Club Admin']}>
              <ClubForm isEdit />
            </ProtectedRoute>
          } 
        />

        {/* Club Overview */}
        <Route 
          path="/club-overview" 
          element={
            <ProtectedRoute requiredRoles={['System Admin', 'Club Admin']}>
              <ClubOverviewPage />
            </ProtectedRoute>
          } 
        />

        {/* Member Management Pages */}
        <Route 
          path="/member/add" 
          element={
            <ProtectedRoute requiredRoles={['System Admin', 'Club Admin', 'Member Admin']}>
              <MemberForm />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/member/edit/:id" 
          element={
            <ProtectedRoute requiredRoles={['System Admin', 'Club Admin', 'Member Admin']}>
              <MemberForm isEdit />
            </ProtectedRoute>
          } 
        />

        {/* Admin Management - System Admin only */}
        <Route 
          path="/admins" 
          element={
            <ProtectedRoute requiredRoles={["System Admin"]}>
              <AdminPage />
            </ProtectedRoute>
          } 
        />

        {/* Unauthorized and catch-all */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;

