import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  orderBy,
  query,
  startAt,
  endAt,
  Timestamp
} from 'firebase/firestore';
import { formatDateInput, toRangeMillis } from '../utils/timezone';
import './DailyTotals.css';

const getTimestampValue = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }
  if (typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }
  return null;
};

const getValueByPath = (data, path) => {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(key);
      return Number.isNaN(index) ? undefined : current[index];
    }
    return current[key];
  }, data);
};

const DailyTotals = () => {
  const [startDate, setStartDate] = useState(() => formatDateInput());
  const [endDate, setEndDate] = useState(() => formatDateInput());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDailyCounts = useCallback(async () => {
    if (!startDate || !endDate) {
      return;
    }

    const { startMillis, endMillis } = toRangeMillis(startDate, endDate);

    if (Number.isNaN(startMillis) || Number.isNaN(endMillis)) {
      setError('Invalid date range. Please choose valid dates.');
      setRegistrationCount(0);
      setCheckinCount(0);
      return;
    }

    if (startMillis > endMillis) {
      setError('Start date cannot be after end date.');
      setRegistrationCount(0);
      setCheckinCount(0);
      return;
    }

    const startTimestamp = Timestamp.fromMillis(startMillis);
    const endTimestamp = Timestamp.fromMillis(endMillis);

    const countDocumentsInRange = async (collectionName, primaryField, fallbackFields = []) => {
      const collectionRef = collection(db, collectionName);

      const runRangeQuery = async () => {
        const rangeQuery = query(
          collectionRef,
          orderBy(primaryField),
          startAt(startTimestamp),
          endAt(endTimestamp)
        );
        const snapshot = await getDocs(rangeQuery);
        return snapshot.size;
      };

      const runFallbackScan = async () => {
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.reduce((count, doc) => {
          const data = doc.data();
          const candidateFields = [primaryField, ...fallbackFields];
          const isInRange = candidateFields.some((path) => {
            const rawValue = path ? getValueByPath(data, path) : undefined;
            const timestampValue = getTimestampValue(rawValue);
            return timestampValue !== null && timestampValue >= startMillis && timestampValue <= endMillis;
          });
          return isInRange ? count + 1 : count;
        }, 0);
      };

      try {
        return await runRangeQuery();
      } catch (err) {
        if (err?.code === 'failed-precondition') {
          console.warn(
            `Missing Firestore index for ${collectionName}.${primaryField}. Falling back to client-side filtering.`,
            err
          );
          return await runFallbackScan();
        }
        throw err;
      }
    };

    setLoading(true);
    setError(null);

    try {
      const [registrationsTotal, checkinsTotal] = await Promise.all([
        countDocumentsInRange('registrations', 'submittedAt', [
          'originalSubmittedAt',
          'updatedAt',
          'formData.servedAt',
          'formData.archiveDate',
          'formData.archivedAt'
        ]),
        countDocumentsInRange('checkins', 'checkInTime', [
          'servedAt',
          'timestamp',
          'updatedAt'
        ])
      ]);

      setRegistrationCount(registrationsTotal);
      setCheckinCount(checkinsTotal);

      console.log(
        `Found ${registrationsTotal} registrations and ${checkinsTotal} check-ins from ${startDate} to ${endDate}`
      );
    } catch (error) {
      console.error('Error fetching daily counts:', error);
      setError('Failed to load data. Please try again or verify Firestore permissions.');
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
