import React from "react";
import { Link } from "react-router-dom";
import "./FormStyles_Green.css";
import { getCurrentLocationConfig } from "./locationConfig";

export default function Home() {
  const locationConfig = getCurrentLocationConfig();

  return (
    <div className="home-hero">
      <div className="home-hero-content">
        <div className="home-logos">
          <img src="/spiritlife.png" alt="Spirit Life Church" className="home-logo" />
          <img src="/herc.png" alt="Herc Rentals" className="home-logo" />
          <img src="/ntfb.jpg" alt="North Texas Food Bank" className="home-logo" />
          <img src="/ccd.png" alt="Catholic Charities Dallas" className="home-logo" />
        </div>
        <h1 className="home-title">{locationConfig.welcomeTitle}</h1>
        <p className="home-subtitle">
          {locationConfig.welcomeSubtitle}
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