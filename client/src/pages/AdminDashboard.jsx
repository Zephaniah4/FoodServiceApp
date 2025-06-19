import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import SubmissionsTable from '../components/SubmissionsTable';

const AdminDashboard = () => {
  const handleLogout = () => {
    // your logout logic
  };

  return (
    <div className="admin-container">
      <h2>Admin Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>

      <SubmissionsTable /> {/* This shows the form data */}
    </div>
  );
};
