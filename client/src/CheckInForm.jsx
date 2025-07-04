import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
//import './FormStyles_Green.css';
import { useTranslation } from 'react-i18next';
import './i18n';
import './CheckInForm.css'; // Import the new CSS file
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

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
        // Format the date for comparison (ensure it matches the MM-DD-YYYY format stored in the database)
        const formattedDob = dob; // Already in MM-DD-YYYY format from DatePicker
        q = query(
          collection(db, 'registrations'),
          where('formData.lastName', '==', lastName),
          where('formData.dateOfBirth', '==', formattedDob)
        );
        console.log("Querying by Name/DOB:", lastName, formattedDob);
      }

      const querySnapshot = await getDocs(q);
      console.log("Query snapshot:", querySnapshot);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        const docData = querySnapshot.docs[0].data();
        const docId = querySnapshot.docs[0].id;
        console.log("Found registration:", docData);

        // Store registration data for potential pre-population if TEFAP expires
        // Include the document ID so it can be used for updates
        const registrationWithId = {
          ...docData,
          id: docId
        };
        sessionStorage.setItem('currentRegistrationData', JSON.stringify(registrationWithId));

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
          location: docData.formData.location || '',
          formData: {
            id: docData.formData.id,
            firstName: docData.formData.firstName,
            lastName: docData.formData.lastName,
            location: docData.formData.location || ''
          }
        });
        console.log("Added to checkins collection.");

        setStatus(t('checkin.welcomeMessage', { firstName: docData.formData.firstName }));
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

  // Add success animation for welcome messages
  if (status && status.includes(t('checkin.welcome'))) {
    setTimeout(() => {
      const alertElement = document.querySelector('.alert-success');
      if (alertElement) {
        alertElement.style.animation = 'pulse 0.6s ease-in-out';
      }
    }, 100);
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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
            <DatePicker
              value={dob ? dayjs(dob, "MM-DD-YYYY") : null}
              onChange={(date) => {
                if (date) {
                  setDob(date.format("MM-DD-YYYY"));
                } else {
                  setDob('');
                }
              }}
              format="MM-DD-YYYY"
              slotProps={{
                textField: {
                  size: 'small',
                  required: true,
                  sx: {
                    '& .MuiInputBase-root': {
                      height: '40px !important',
                      minHeight: '40px !important',
                    },
                    '& .MuiInputBase-input': {
                      padding: '8px 12px !important',
                      height: '24px !important',
                      lineHeight: '24px !important',
                    },
                  }
                }
              }}
              sx={{
                width: '100%',
                marginTop: '0.2rem !important',
                '& .MuiInputBase-root': {
                  width: '100%',
                  height: '40px !important',
                  minHeight: '40px !important',
                  maxHeight: '40px !important',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiInputBase-input': {
                  padding: '8px 12px !important',
                  height: '24px !important',
                  lineHeight: '24px !important',
                },
              }}
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
              : status.includes(t('checkin.welcome'))
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
    </LocalizationProvider>
  );
}
