import React from "react";
import { Link } from "react-router-dom";
import "./FormStyles_Green.css";
import { getCurrentLocationConfig } from "./locationConfig";

export default function Home() {
  const locationConfig = getCurrentLocationConfig();
  const isPlanoDallas = locationConfig.key === "planoDallas";
  const isGarland = locationConfig.key === "garland";
  const isRowlett = locationConfig.key === "rowlett";

  return (
    <div className="home-hero">
      <div className="home-hero-content">
        <div className="home-logos">
          {isPlanoDallas && <img src="/spiritlife.png" alt="Spirit Life Church" className="home-logo" />}
          {isPlanoDallas && <img src="/herc.png" alt="Herc Rentals" className="home-logo" />}
          {isGarland && (
            <img
              src="/Oasis logo.png"
              alt="Oasis on the Mount"
              className="home-logo"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
          {isRowlett && (
            <img
              src="/New Life.png"
              alt="New Life Assembly"
              className="home-logo"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
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