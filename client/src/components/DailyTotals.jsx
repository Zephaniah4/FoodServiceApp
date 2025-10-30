import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import './DailyTotals.css';

const DailyTotals = () => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDailyCounts = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      // Create start and end timestamps for the date range
      const startTimestamp = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
      const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

      // Query ALL registrations in date range (using submittedAt field)
      const registrationsQuery = query(
        collection(db, 'registrations'),
        where('submittedAt', '>=', startTimestamp),
        where('submittedAt', '<=', endTimestamp)
      );
      const registrationsSnapshot = await getDocs(registrationsQuery);
      
      // Count all registrations regardless of status (live, archived, etc.)
      const allRegistrations = registrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRegistrationCount(allRegistrations.length);

      // Query ALL check-ins in date range (using checkInTime field)
      const checkinsQuery = query(
        collection(db, 'checkins'),
        where('checkInTime', '>=', startTimestamp),
        where('checkInTime', '<=', endTimestamp)
      );
      const checkinsSnapshot = await getDocs(checkinsQuery);
      
      // Count all check-ins regardless of status
      const allCheckins = checkinsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCheckinCount(allCheckins.length);

      console.log(`Found ${allRegistrations.length} registrations and ${allCheckins.length} check-ins from ${startDate} to ${endDate}`);

    } catch (error) {
      console.error('Error fetching daily counts:', error);
      setError('Failed to load data');
      setRegistrationCount(0);
      setCheckinCount(0);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDailyCounts();
  }, [fetchDailyCounts]);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);
  const handleApplyRange = () => setIsDropdownOpen(false);

  return (
    <div className="daily-totals-container">
      <div className="daily-totals-header">
        <h3 className="daily-totals-title">Daily Totals</h3>
        <div className="date-range-selector">
          <div className="date-dropdown">
            <button
              className="date-dropdown-button"
              onClick={toggleDropdown}
              type="button"
              aria-expanded={isDropdownOpen}
              aria-controls="daily-totals-date-menu"
            >
              {startDate} to {endDate} ▼
            </button>
            {isDropdownOpen && (
              <div className="date-dropdown-content" id="daily-totals-date-menu">
                <div className="date-picker-row">
                  <label htmlFor="daily-totals-from">From:</label>
                  <input
                    id="daily-totals-from"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setError(null);
                    }}
                    className="date-input"
                  />
                </div>
                <div className="date-picker-row">
                  <label htmlFor="daily-totals-to">To:</label>
                  <input
                    id="daily-totals-to"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setError(null);
                    }}
                    className="date-input"
                  />
                </div>
                <button
                  className="date-apply-button"
                  onClick={handleApplyRange}
                  type="button"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="totals-display">
        <div className="total-item">
          <span className="total-label">Registrations</span>
          <span className="total-count">{loading ? '...' : registrationCount}</span>
        </div>
        <div className="total-item">
          <span className="total-label">Check-ins</span>
          <span className="total-count">{loading ? '...' : checkinCount}</span>
        </div>
      </div>

      {error && <div className="daily-totals-error">{error}</div>}
    </div>
  );
};

export default DailyTotals;
