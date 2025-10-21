import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import AdminViewer from "./AdminViewer";  // Import the current working AdminViewer
import DatabaseManager from "./components/DatabaseManager";
import "./AdminViewer.css";

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // Start with LIVE operations (current AdminViewer)
  const [loginError, setLoginError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginError("");
    } catch (error) {
      setLoginError("Invalid credentials. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Login form if not authenticated
  if (!user) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px"
        }}>
          <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Admin Login</h2>
          
          {loginError && (
            <div style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              padding: "0.75rem",
              borderRadius: "4px",
              marginBottom: "1rem",
              textAlign: "center"
            }}>
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Email:
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px"
                }}
              />
            </div>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Password:
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px"
                }}
              />
            </div>
            
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main admin dashboard with tabs
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div style={{
        backgroundColor: "#2196F3",
        color: "white",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: "#f8f9fa",
        borderBottom: "2px solid #e0e0e0",
        padding: "0 2rem"
      }}>
        <div style={{ display: "flex" }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: "12px 24px",
              border: "none",
              background: activeTab === 'live' ? 'white' : 'transparent',
              cursor: "pointer",
              borderBottom: activeTab === 'live' ? '3px solid #2196F3' : '3px solid transparent',
              fontSize: "16px",
              fontWeight: "500",
              color: activeTab === 'live' ? '#2196F3' : '#666'
            }}
          >
            � Live Operations
          </button>
          
          <button
            onClick={() => setActiveTab('database')}
            style={{
              padding: "12px 24px",
              border: "none",
              background: activeTab === 'database' ? 'white' : 'transparent',
              cursor: "pointer",
              borderBottom: activeTab === 'database' ? '3px solid #2196F3' : '3px solid transparent',
              fontSize: "16px",
              fontWeight: "500",
              color: activeTab === 'database' ? '#2196F3' : '#666'
            }}
          >
            �️ Database Manager
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === 'live' && <AdminViewer />}
        {activeTab === 'database' && <DatabaseManager />}
      </div>
    </div>
  );
}

export default AdminDashboard;