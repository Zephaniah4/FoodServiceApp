import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import RegistrationForm from './RegistrationForm';
import CheckInForm from './CheckInForm';
import './FormStyles_Green.css';
import './i18n';
import AdminViewer from './AdminViewer';
import ErrorBoundary from "./ErrorBoundary";
import Home from './Home';

function App() {
  return (
    <ErrorBoundary>
       <Router>
        <div className="app-container">
          <header className="header">
            <h1>Food Service App</h1>
            <div className="navbar">
              <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink>
              <NavLink to="/register" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Registration</NavLink>
              <NavLink to="/checkin" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Check-In</NavLink>
              <NavLink to="/admin" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Admin</NavLink>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<RegistrationForm />} />
              <Route path="/checkin" element={<CheckInForm />} />
              <Route path="/admin" element={<AdminViewer />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
