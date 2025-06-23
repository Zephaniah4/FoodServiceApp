import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import i18n from './i18n';
import { useTranslation } from 'react-i18next';
import './FormStyles_Green.css';
import logo from './ntfb_header_logo_retina.png';
import { db } from './firebase';
import { collection, addDoc, updateDoc, Timestamp, query, where, getDocs, doc } from 'firebase/firestore';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export default function RegistrationForm() {
  const { t } = useTranslation();
  const sigRef = useRef();
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', phone: '', address: '',
    apartment: '', city: '', state: '', zipCode: '', race: '', ethnicity: '', sex: '', maritalStatus: '',
    children: '0', adults: '0', seniors: '0', language: '', countryOfBirth: '',
    incomeYear: '', incomeMonth: '', incomeWeek: '',
    snap: false, tanf: false, ssi: false, nsls: false, medicaid: false,
    crisisReason: '', agreedToCert: false
  });
  const [existingRegistration, setExistingRegistration] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isRenewal, setIsRenewal] = useState(false);
  const [showRenewalMessage, setShowRenewalMessage] = useState(false);

  // Handle pre-population from expired TEFAP renewal
  useEffect(() => {
    const prePopulateData = sessionStorage.getItem('prePopulateRegistration');
    const isRenewalFlag = sessionStorage.getItem('isRenewal');
    
    if (prePopulateData && isRenewalFlag === 'true') {
      try {
        const existingData = JSON.parse(prePopulateData);
        
        // Pre-populate form with existing data
        setForm(prevForm => ({
          ...prevForm,
          ...existingData,
          // Reset signature and agreement for new registration
          agreedToCert: false
        }));
        
        setIsRenewal(true);
        setShowRenewalMessage(true);
        
        // Clear the session storage
        sessionStorage.removeItem('prePopulateRegistration');
        sessionStorage.removeItem('isRenewal');
        
        // Auto-hide the renewal message after 10 seconds
        setTimeout(() => {
          setShowRenewalMessage(false);
        }, 10000);
        
      } catch (error) {
        console.error('Error parsing pre-populate data:', error);
      }
    }
  }, []);

  // Phone number formatting function
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/[^\d]/g, '');
    
    // Apply formatting based on length
    if (phoneNumber.length < 4) {
      return phoneNumber;
    } else if (phoneNumber.length < 7) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'phone') {
      // Format phone number as user types
      const formattedPhone = formatPhoneNumber(value);
      setForm(prev => ({ ...prev, [name]: formattedPhone }));
    } else {
      setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  // Function to check for duplicate registrations
  const checkForDuplicates = async (formData) => {
    try {
      // Check by multiple criteria to catch potential duplicates
      const queries = [
        // Exact match by first name, last name, and date of birth
        query(
          collection(db, 'registrations'),
          where('formData.firstName', '==', formData.firstName),
          where('formData.lastName', '==', formData.lastName),
          where('formData.dateOfBirth', '==', formData.dateOfBirth)
        ),
        // Match by phone number
        query(
          collection(db, 'registrations'),
          where('formData.phone', '==', formData.phone)
        ),
        // Match by full address
        query(
          collection(db, 'registrations'),
          where('formData.address', '==', formData.address),
          where('formData.city', '==', formData.city),
          where('formData.zipCode', '==', formData.zipCode)
        )
      ];

      // Execute all queries
      const queryResults = await Promise.all(queries.map(q => getDocs(q)));
      
      // Combine all potential duplicates
      const allDuplicates = [];
      queryResults.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          // Avoid adding the same document multiple times
          if (!allDuplicates.find(dup => dup.id === doc.id)) {
            allDuplicates.push({ id: doc.id, ...doc.data() });
          }
        });
      });

      // Return all duplicates (including archived registrations)
      return allDuplicates;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return [];
    }
  };

  // Function to handle updating an existing registration
  const updateExistingRegistration = async (existingReg, newFormData) => {
    try {
      const signature = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      
      // Preserve existing TEFAP data if it exists, otherwise set default values
      const existingTefapDate = existingReg.formData?.tefapDate;
      const existingTefapEligible = existingReg.formData?.tefapEligible;
      
      const formWithSignature = { 
        ...newFormData, 
        signature,
        // Preserve existing TEFAP data or set defaults for first-time updates
        tefapDate: existingTefapDate || new Date().toISOString().slice(0, 10),
        tefapEligible: existingTefapEligible !== undefined ? existingTefapEligible : false
      };

      // Update the existing registration with new data
      await updateDoc(doc(db, 'registrations', existingReg.id), {
        formData: formWithSignature,
        updatedAt: Timestamp.now(),
        originalSubmittedAt: existingReg.submittedAt // Preserve original submission date
      });

      alert("Registration updated successfully with new information!");
      return true;
    } catch (error) {
      console.error("Error updating registration:", error);
      alert("An error occurred while updating the registration.");
      return false;
    }
  };

  // Function to create a new registration
  const createNewRegistration = async (formData) => {
    try {
      const signature = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      
      // Automatically set TEFAP date to current date for new registrations
      const currentDate = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
      
      const formWithSignature = { 
        ...formData, 
        signature,
        tefapDate: currentDate,
        tefapEligible: false // Default to false, admin can change later
      };

      // Save the form data in a field called "formData"
      const docRef = await addDoc(collection(db, 'registrations'), {
        formData: formWithSignature,
        submittedAt: Timestamp.now()
      });

      // Save the Firestore ID into the same document inside "formData.id"
      await updateDoc(docRef, {
        'formData.id': docRef.id
      });

      alert("Registration submitted successfully.");
      return true;
    } catch (error) {
      console.error("Error submitting registration:", error);
      alert("An error occurred while submitting.");
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'phone', 'address',
      'city', 'state', 'zipCode', 'race', 'ethnicity', 'sex', 'maritalStatus',
      'children', 'adults', 'seniors'
    ];

    for (const field of requiredFields) {
      const value = form[field];
      
      // For numeric fields (children, adults, seniors), ensure they have a valid number
      if (['children', 'adults', 'seniors'].includes(field)) {
        if (value === '' || value === null || value === undefined) {
          alert(t(`Please fill out the required field: ${field}`));
          return;
        }
      } else {
        // For other fields, check if they're empty
        if (value === '' || value === null || value === undefined) {
          alert(t(`Please fill out the required field: ${field}`));
          return;
        }
      }
    }

    // Separate validation for checkbox
    if (!form.agreedToCert) {
      alert(t(`Please agree to the certification to continue.`));
      return;
    }

    // Validate signature is present
    if (sigRef.current.isEmpty()) {
      alert(t('signatureRequired'));
      return;
    }

    // Check for duplicate registrations
    const duplicates = await checkForDuplicates(form);
    
    if (duplicates.length > 0) {
      // Found potential duplicates - show dialog to user
      setExistingRegistration(duplicates[0]); // Use the first match
      setShowDuplicateDialog(true);
      return;
    }

    // No duplicates found, proceed with new registration
    const success = await createNewRegistration(form);
    if (success) {
      resetForm();
    }
  };

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', dateOfBirth: '', phone: '', address: '',
      apartment: '', city: '', state: '', zipCode: '', race: '', ethnicity: '', sex: '', maritalStatus: '',
      children: '0', adults: '0', seniors: '0', language: '', countryOfBirth: '',
      incomeYear: '', incomeMonth: '', incomeWeek: '',
      snap: false, tanf: false, ssi: false, nsls: false, medicaid: false,
      crisisReason: '', agreedToCert: false
    });
    sigRef.current.clear();
    setExistingRegistration(null);
    setShowDuplicateDialog(false);
  };

  // Handle user's choice when duplicate is found
  const handleDuplicateChoice = async (choice) => {
    if (choice === 'update') {
      const success = await updateExistingRegistration(existingRegistration, form);
      if (success) {
        resetForm();
      }
    } else if (choice === 'new') {
      const success = await createNewRegistration(form);
      if (success) {
        resetForm();
      }
    } else {
      // Cancel - just close the dialog
      setShowDuplicateDialog(false);
    }
  };

  // US States Array
  const usStates = [
    { value: '', label: t('selectState') },
    { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'DC', label: 'District Of Columbia' },
    { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }
  ];

  // Array for children options (0-15)
  const childrenOptions = Array.from({ length: 16 }, (_, i) => i);

  const currentYear = new Date().getFullYear();
  const minYear = 1915;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form className="form-container" onSubmit={handleSubmit}>
        
        <div className="form-header">
          <img src={logo} alt="Logo" />
          <div>
            <h2>{t('registerForServices')}</h2>
            {isRenewal && (
              <div style={{ 
                color: '#4CAF50', 
                fontSize: '14px', 
                fontWeight: 'normal',
                marginTop: '4px'
              }}>
                {t('renewal.subtitle') || 'TEFAP Registration Renewal'}
              </div>
            )}
          </div>
        </div>

        <div className="language-switcher">
          <label>{t('language')}</label>
          <select onChange={(e) => i18n.changeLanguage(e.target.value)} defaultValue="en">
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        {/* Renewal notification message */}
        {showRenewalMessage && (
          <div className="renewal-notification">
            <div className="renewal-content">
              <span className="renewal-icon">🔄</span>
              <div>
                <strong>{t('renewal.title')}</strong>
                <p>{t('renewal.message')}</p>
              </div>
              <button 
                type="button" 
                className="renewal-close" 
                onClick={() => setShowRenewalMessage(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="form-section">
          <h3>{t('personalInfo')}</h3>
          <div className="form-grid"> {/* Apply form-grid here */}
            <label>{t('firstName')}
              <input name="firstName" value={form.firstName} onChange={handleChange} required />
            </label>
            <label>{t('lastName')}
              <input name="lastName" value={form.lastName} onChange={handleChange} required />
            </label>
            <label>{t('dob')}
              <DatePicker
                value={form.dateOfBirth ? dayjs(form.dateOfBirth, "MM-DD-YYYY") : null}
                onChange={(date) => {
                  if (date) {
                    handleChange({ target: { name: 'dateOfBirth', value: date.format("MM-DD-YYYY") } });
                  } else {
                    handleChange({ target: { name: 'dateOfBirth', value: null } });
                  }
                }}
                minDate={dayjs().year(minYear)}
                maxDate={dayjs().year(currentYear)}
                format="MM-DD-YYYY"
                slotProps={{
                  textField: {
                    size: 'small',
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
                  alignSelf: 'flex-end',
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
                    fontSize: '1rem',
                    color: '#333',
                    height: '24px !important',
                    lineHeight: '24px !important',
                    border: '1px solid #bdbdbd',
                    borderRadius: '5px',
                    boxSizing: 'border-box',
                  },
                  '& .MuiInputBase-input:focus': {
                    borderColor: '#388e3c',
                    outline: 'none',
                    boxShadow: '0 0 0 2px rgba(56, 142, 60, 0.2)',
                  },
                  '& .MuiIconButton-root': {
                    padding: '8px',
                    color: '#757575',
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      border: 'none',
                    },
                  },
                }}
              />
            </label>
            <label>{t('phone')}
              <input 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="123-456-7890"
                maxLength="12"
                required 
              />
            </label>
            <label>{t('address')}
              <input name="address" value={form.address} onChange={handleChange} required />
            </label>
            <label>{t('apartment')}
              <input name="apartment" value={form.apartment} onChange={handleChange} />
            </label>
            <label>{t('city')}
              <input name="city" value={form.city} onChange={handleChange} required />
            </label>
            <label>{t('state')}
              <select name="state" value={form.state} onChange={handleChange} required>
                {usStates.map((state) => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
            </label>
            <label>{t('zip')}
              <input name="zipCode" value={form.zipCode} onChange={handleChange} required />
            </label>
            <label>{t('race')}
              <select name="race" value={form.race} onChange={handleChange} required>
                <option value="">{t('selectRace')}</option>
                <option value="White">White</option>
                <option value="Black">Black</option>
                <option value="Latino">Latino</option>
                <option value="Asian">Asian</option>
                <option value="Native">Native</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>{t('ethnicity')}
              <select name="ethnicity" value={form.ethnicity} onChange={handleChange} required>
                <option value="">{t('selectEthnicity')}</option>
                <option value="Hispanic">{t('Hispanic')}</option>
                <option value="Non-Hispanic">{t('Non-Hispanic')}</option>
              </select>
            </label>
            <label>{t('sex')}
              <select name="sex" value={form.sex} onChange={handleChange} required>
                <option value="">{t('selectSex')}</option>
                <option value="Male">{t('Male')}</option>
                <option value="Female">{t('Female')}</option>
              </select>
            </label>
            <label>{t('maritalStatus')}
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange} required>
                <option value="">{t('selectMaritalStatus')}</option>
                <option value="Single">{t('Single')}</option>
                <option value="Married">{t('Married')}</option>
                <option value="Divorced">{t('Divorced')}</option>
                <option value="Widowed">{t('Widowed')}</option>
              </select>
            </label>
          </div> {/* Close form-grid here */}
        </div>

        <div className="form-section">
          <h3>{t('household')}</h3>
          <div className="form-grid">
            <label>{t('children')}
              <select name="children" value={form.children} onChange={handleChange} required>
                {childrenOptions.map((childAge) => (
                  <option key={childAge} value={childAge.toString()}>{childAge}</option>
                ))}
              </select>
            </label>
            <label>{t('adults')}
              <select name="adults" value={form.adults} onChange={handleChange} required>
                {childrenOptions.map((adultAge) => (
                  <option key={adultAge} value={adultAge.toString()}>{adultAge}</option>
                ))}
              </select>
            </label>
            <label>{t('seniors')}
              <select name="seniors" value={form.seniors} onChange={handleChange} required>
                {childrenOptions.map((seniorAge) => (
                  <option key={seniorAge} value={seniorAge.toString()}>{seniorAge}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('languageAndOrigin')}</h3>
          <div className="form-grid">
            <label>{t('preferredLanguage')}
              <input name="language" value={form.language} onChange={handleChange} />
            </label>
            <label>{t('countryOfBirth')}
              <input name="countryOfBirth" value={form.countryOfBirth} onChange={handleChange} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('income')}</h3>
          <div className="form-grid">
            <label>{t('incomeYear')}
              <input name="incomeYear" value={form.incomeYear} onChange={handleChange} />
            </label>
            <label>{t('incomeMonth')}
              <input name="incomeMonth" value={form.incomeMonth} onChange={handleChange} />
            </label>
            <label>{t('incomeWeek')}
              <input name="incomeWeek" value={form.incomeWeek} onChange={handleChange} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('programs')}</h3>
          <div className="checkboxes-with-desc">
            <label><input type="checkbox" name="snap" checked={form.snap} onChange={handleChange} /><strong>SNAP</strong> – {t('descSnap')}</label>
            <label><input type="checkbox" name="tanf" checked={form.tanf} onChange={handleChange} /><strong>TANF</strong> – {t('descTanf')}</label>
            <label><input type="checkbox" name="ssi" checked={form.ssi} onChange={handleChange} /><strong>SSI</strong> – {t('descSsi')}</label>
            <label><input type="checkbox" name="nsls" checked={form.nsls} onChange={handleChange} /><strong>NSLP</strong> – {t('descNsls')}</label>
            <label><input type="checkbox" name="medicaid" checked={form.medicaid} onChange={handleChange} /><strong>Medicaid</strong> – {t('descMedicaid')}</label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('householdCrisisEligibility')}</h3>
          <div className="form-grid">
            <label>{t('If household is eligible for household crisis food needs, document reason for crisis here.')}
              <textarea
                name="crisisReason"
                value={form.crisisReason || ''}
                onChange={handleChange}
                rows="4"
                style={{ width: '100%' }}
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('certification')}</h3>
          <div className="info-box">
            <p>{t('cert1')}</p>
            <p>{t('cert2')}</p>
            <p>{t('cert3')}</p>
          </div>
          <label style={{ marginTop: '1rem', display: 'block' }}>
            <input
              type="checkbox"
              name="agreedToCert"
              checked={form.agreedToCert || false}
              onChange={handleChange}
              style={{ marginRight: '0.5rem' }}
              required
            />
            {t('agreeCertLabel')}
          </label>
        </div>

        <div className="form-section">
          <h3>{t('usdaTitle')}</h3>
          <div className="info-box">
            <p>{t('usda1')}</p>
            <p>{t('usda2')}</p>
            <p>{t('usda3')}</p>
          </div>
        </div>

        {/* Applicants Authorization Section */}
        <div className="form-section">
          <h3>{t('applicantAuthorizationTitle')}</h3>
          <div className="info-box">
            <p>{t('applicantAuthorization')}</p>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('signature')}</h3>
          <SignatureCanvas
            ref={sigRef}
            penColor="black"
            canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
          />
        </div>

        <button type="submit">{t('submit')}</button>
      </form>

      {/* Duplicate Registration Dialog */}
      {showDuplicateDialog && existingRegistration && (
        <div className="modal-overlay">
          <div className="duplicate-dialog">
            <div className="duplicate-header">
              <h2>Potential Duplicate Registration Found</h2>
            </div>
            <div className="duplicate-content">
              <p><strong>We found an existing registration that might match this submission:</strong></p>
              
              <div className="existing-info">
                <h3>Existing Registration:</h3>
                <div className="info-grid">
                  <div><strong>Name:</strong> {existingRegistration.formData?.firstName} {existingRegistration.formData?.lastName}</div>
                  <div><strong>Phone:</strong> {existingRegistration.formData?.phone}</div>
                  <div><strong>Date of Birth:</strong> {existingRegistration.formData?.dateOfBirth}</div>
                  <div><strong>Address:</strong> {existingRegistration.formData?.address}, {existingRegistration.formData?.city}</div>
                  <div><strong>Submitted:</strong> {existingRegistration.submittedAt && typeof existingRegistration.submittedAt.toDate === "function" 
                    ? existingRegistration.submittedAt.toDate().toLocaleDateString() 
                    : 'Unknown'}</div>
                </div>
              </div>

              <div className="new-info">
                <h3>New Registration:</h3>
                <div className="info-grid">
                  <div><strong>Name:</strong> {form.firstName} {form.lastName}</div>
                  <div><strong>Phone:</strong> {form.phone}</div>
                  <div><strong>Date of Birth:</strong> {form.dateOfBirth}</div>
                  <div><strong>Address:</strong> {form.address}, {form.city}</div>
                  <div><strong>Today:</strong> {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <p><strong>What would you like to do?</strong></p>
            </div>
            
            <div className="duplicate-actions">
              <button 
                className="btn-update" 
                onClick={() => handleDuplicateChoice('update')}
              >
                Update Existing Registration
                <small>This will update the existing registration with the new information you've entered</small>
              </button>
              <button 
                className="btn-new" 
                onClick={() => handleDuplicateChoice('new')}
              >
                Create New Registration Anyway
                <small>This will create a separate registration (use if this is a different person)</small>
              </button>
              <button 
                className="btn-cancel" 
                onClick={() => handleDuplicateChoice('cancel')}
              >
                Cancel
                <small>Go back and review the information</small>
              </button>
            </div>
          </div>
        </div>
      )}
    </LocalizationProvider>
  );
}
