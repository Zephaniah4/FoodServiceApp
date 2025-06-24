import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
//import './FormStyles_Green.css';
import { useTranslation } from 'react-i18next';
import './i18n';
import './CheckInForm.css'; // Import the new CSS file

export default function CheckInForm() {
  const [method, setMethod] = useState('id');
  const [userId, setUserId] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [tefapExpired, setTefapExpired] = useState(false);
  const { t, i18n } = useTranslation();

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    setTefapExpired(false); // Reset TEFAP expired state
    console.log("Check-in started. Method:", method);

    try {
      let q;
      if (method === 'id') {
        q = query(collection(db, 'registrations'), where('formData.id', '==', userId));
        console.log("Querying by ID:", userId);
      } else {
        q = query(
          collection(db, 'registrations'),
          where('formData.lastName', '==', lastName),
          where('formData.dateOfBirth', '==', dob)
        );
        console.log("Querying by Name/DOB:", lastName, dob);
      }

      const querySnapshot = await getDocs(q);
      console.log("Query snapshot:", querySnapshot);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        const docData = querySnapshot.docs[0].data();
        console.log("Found registration:", docData);

        // Store registration data for potential pre-population if TEFAP expires
        sessionStorage.setItem('currentRegistrationData', JSON.stringify(docData));

        // Check TEFAP date expiration (1 year)
        const tefapDate = docData.formData?.tefapDate;
        if (tefapDate) {
          const tefapDateTime = new Date(tefapDate);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          if (tefapDateTime < oneYearAgo) {
            setStatus(t('checkin.tefapExpired'));
            setTefapExpired(true);
            setLoading(false);
            
            // Optionally, you could redirect to the registration form
            // window.location.href = '/register'; // Uncomment if you want automatic redirect
            
            return; // Stop the check-in process
          }
        }

        // Reset TEFAP expired flag if date is valid
        setTefapExpired(false);

        await updateDoc(docRef, {
          lastCheckIn: Timestamp.now()
        });
        console.log("Updated lastCheckIn for registration.");

        // Check if already checked in
        const checkinQuery = query(
          collection(db, "checkins"),
          where("userId", "==", userId), // or use the registration's unique id
          where("status", "==", "waiting")
        );
        const checkinSnapshot = await getDocs(checkinQuery);

        if (!checkinSnapshot.empty) {
          setStatus(t('checkin.alreadyCheckedIn')); // Add this key to your translations
          setLoading(false);
          return;
        }

        await addDoc(collection(db, 'checkins'), {
          userId: method === 'id' ? userId : docData.formData.id || '',
          name: `${docData.formData.firstName} ${docData.formData.lastName}`,
          checkInTime: Timestamp.now(),
          status: "waiting",
          phone: docData.formData.phone || '',
          household: docData.formData.household || '',
        });
        console.log("Added to checkins collection.");

        setStatus(t('checkin.checkinConfirmed', { name: docData.formData.firstName }));
      } else {
        setStatus(t('checkin.noMatchingRecord'));
        console.log("No matching registration found.");
      }
    } catch (error) {
      setStatus(t('checkin.error'));
      console.error("Check-in error:", error);
    }

    setLoading(false);
  };

  // Add loading animation to form
  if (loading) {
    document.querySelector('.submit-button')?.classList.add('loading');
  } else {
    document.querySelector('.submit-button')?.classList.remove('loading');
  }

  // Add success animation for success messages
  if (status.startsWith(t('checkin.checkinConfirmed', { name: '' }).trim())) {
    setTimeout(() => {
      const alertElement = document.querySelector('.alert-success');
      if (alertElement) {
        alertElement.style.animation = 'pulse 0.6s ease-in-out';
      }
    }, 100);
  }

  return (
    <div className="checkin-container"> {/* Apply the checkin-container class */}
      <div className="language-selector">
        <label htmlFor="language-select" style={{ marginRight: 8 }}>
          {t('checkin.language')}
        </label>
        <select
          value={i18n.language}
          onChange={e => i18n.changeLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>
      <h2 className="checkin-title">{t('checkin.title')}</h2> {/* Apply the checkin-title class */}
      <div className="checkin-methods">
        <button onClick={() => setMethod('id')} className={method === 'id' ? 'active' : ''}>{t('checkin.useId')}</button>
        <button onClick={() => setMethod('name')} className={method === 'name' ? 'active' : ''}>{t('checkin.useNameDob')}</button>
      </div>

      <form onSubmit={handleCheckIn} className="form-grid"> {/* Apply the form-grid class */}
        {method === 'id' ? (
          <>
            <label htmlFor="userId">{t('checkin.idLabel')}</label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            <label htmlFor="lastName">{t('checkin.lastNameLabel')}</label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <label htmlFor="dob">{t('checkin.dobLabel')}</label>
            <input
              type="text"
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              placeholder="MM-DD-YYYY"
              pattern="\d{2}-\d{2}-\d{4}"
              required
            />
          </>
        )}

        <button type="submit" className="submit-button" disabled={loading}> {/* Apply the submit-button class */}
          {loading ? t('checkin.checkingIn') : t('checkin.checkIn')}
        </button>
      </form>

      {status && (
        <div
          className={
            status === t('checkin.noMatchingRecord')
              ? "alert-no-record" // Apply the alert-no-record class
              : status === t('checkin.tefapExpired')
              ? "tefap-expired-warning" // Apply the TEFAP expiration warning class
              : status.includes(t('checkin.alreadyCheckedIn'))
              ? "alert alert-warning"
              : status.startsWith("Welcome")
              ? "alert alert-success"
              : status.startsWith("Error")
              ? "alert alert-error"
              : "alert"
          }
        >
          {status}
          {tefapExpired && (
            <div style={{ marginTop: '15px' }}>
              <button 
                onClick={() => {
                  // Store the existing registration data in sessionStorage for pre-population
                  const docData = JSON.parse(sessionStorage.getItem('currentRegistrationData') || '{}');
                  sessionStorage.setItem('prePopulateRegistration', JSON.stringify(docData.formData || {}));
                  sessionStorage.setItem('isRenewal', 'true');
                  window.location.href = '/register';
                }}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {t('checkin.registerNow')}
              </button>
            </div>
          )}
        </div>
      )}
          </div>
  );
}
