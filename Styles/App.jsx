import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard'; // placeholder for now
import RegistrationForm from './RegistrationForm';
import CheckInForm from './CheckInForm'; // 
import PrivateRoute from './PrivateRoute'; // 
import { Link } from 'react-router-dom';

function App() {
  return ( <CheckInForm />

    <Router>
      <div>
        <nav>
          <Link to="/checkin">
            <button>Check-In</button>
          </Link>
        </nav>
        <Routes>
          <Route path="/" element={<RegistrationForm />} />
          <Route path="/checkin" element={<CheckInForm />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;