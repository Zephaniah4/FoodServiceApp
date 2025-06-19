import React from "react";
import { Link } from "react-router-dom";
import "./FormStyles_Green.css";

export default function Home() {
  return (
    <div className="home-hero">
      <div className="home-hero-content">
        <div className="home-logos">
          <img src="/spiritlife.png" alt="Spirit Life Church" className="home-logo" />
          <img src="/herc.png" alt="Herc Rentals" className="home-logo" />
          <img src="/ntfb.jpg" alt="North Texas Food Bank" className="home-logo" />
          <img src="/ccd.png" alt="Catholic Charities Dallas" className="home-logo" />
        </div>
        <h1 className="home-title">Welcome to Food Service App</h1>
        <p className="home-subtitle">
          Streamlining registrations and check-ins for your community food service.
        </p>
        <div className="home-actions">
          <Link to="/register" className="home-btn">Register</Link>
          <Link to="/checkin" className="home-btn">Check-In</Link>
          <Link to="/admin" className="home-btn">Admin</Link>
        </div>
      </div>
    </div>
  );
}