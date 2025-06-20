import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import i18n from './i18n';
import { useTranslation } from 'react-i18next';
import './FormStyles_Green.css';
import logo from './ntfb_header_logo_retina.png';
import { db } from './firebase';
import { collection, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export default function RegistrationForm() {
  const { t } = useTranslation();
  const sigRef = useRef();
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', phone: '', address: '',
    apartment: '', city: '', state: '', zipCode: '', ethnicity: '', sex: '', maritalStatus: '',
    children: '0', adults: '0', seniors: '0', language: '', countryOfBirth: '',
    incomeYear: '', incomeMonth: '', incomeWeek: '',
    snap: false, tanf: false, ssi: false, nsls: false, medicaid: false,
    crisisReason: '', agreedToCert: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'phone', 'address',
      'city', 'state', 'zipCode', 'ethnicity', 'sex', 'maritalStatus',
      'children', 'adults', 'seniors', 'agreedToCert'
    ];

for (const field of requiredFields) {
  if (form[field] === '' ||
    form[field] === null ||
    form[field] === undefined ||
    (field === 'children' && form[field] === '') ||
    (field === 'adults' && form[field] === '') ||
    (field === 'seniors' && form[field] === ''))
     {
    alert(t(`Please fill out the required field: ${field}`));
    return;
  }
}

    try {
      const signature = sigRef.current.getTrimmedCanvas().toDataURL('image/png');

      // Attach the signature to the form
      const formWithSignature = { ...form, signature };

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

      // Reset the form
      setForm({
        firstName: '', lastName: '', dateOfBirth: '', phone: '', address: '',
        apartment: '', city: '', state: '', zipCode: '', ethnicity: '', sex: '', maritalStatus: '',
        children: '', adults: '', seniors: '', language: '', countryOfBirth: '',
        incomeYear: '', incomeMonth: '', incomeWeek: '',
        snap: false, tanf: false, ssi: false, nsls: false, medicaid: false,
        crisisReason: '', agreedToCert: false
      });

      sigRef.current.clear();
    } catch (error) {
      console.error("Error submitting registration:", error);
      alert("An error occurred while submitting.");
    }
  };

  // US States Array
  const usStates = [
    { value: '', label: 'Select a state' },
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
  const minYear = currentYear - 70;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form className="form-container" onSubmit={handleSubmit}>
        
        <div className="form-header">
          <img src={logo} alt="Logo" />
          <h2>{t('registerForServices')}</h2>
        </div>

        <div className="language-switcher">
          <label>{t('language')}</label>
          <select onChange={(e) => i18n.changeLanguage(e.target.value)} defaultValue="en">
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

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
                sx={{
                  marginTop: 'rem',
                  maxHeight: '1.8rem',
                  width: '100%',
                  '& .MuiInputBase-root': {
                    width: '100%',
                  },
                  '& .MuiInputBase-input': {
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #bdbdbd',
                    borderRadius: '5px',
                    fontSize: '1rem',
                    color: '#333',
                  },
                  '& .MuiInputBase-input:focus': {
                    borderColor: '#388e3c',
                    outline: 'none',
                    boxShadow: '0 0 0 2px rgba(56, 142, 60, 0.2)',
                  },
                  '& .MuiIconButton-root': {
                    padding: '0.5rem',
                    color: '#757575',
                  },
                  '& .MuiIconButton-root:hover': {
                    backgroundColor: 'rgba(56, 142, 60, 0.08)',
                  },
                }}
              />
            </label>
            <label>{t('phone')}
              <input name="phone" value={form.phone} onChange={handleChange} required />
            </label>
            <label>{t('address')}
              <input name="address" value={form.address} onChange={handleChange} required />
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
            <label>{t('ethnicity')}
              <select name="ethnicity" value={form.ethnicity} onChange={handleChange} required>
                <option value="">Select Ethnicity</option>
                <option value="White">White</option>
                <option value="Black">Black</option>
                <option value="Hispanic">Hispanic</option>
                <option value="Asian">Asian</option>
                <option value="Native">Native</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>{t('sex')}
              <select name="sex" value={form.sex} onChange={handleChange} required>
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label>{t('maritalStatus')}
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange} required>
                <option value="">Select Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
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
                  <option key={childAge} value={childAge}>{childAge}</option>
                ))}
              </select>
            </label>
            <label>{t('adults')}
              <select name="adults" value={form.adults} onChange={handleChange} required>
                {childrenOptions.map((adultAge) => (
                  <option key={adultAge} value={adultAge}>{adultAge}</option>
                ))}
              </select>
            </label>
            <label>{t('seniors')}
              <select name="seniors" value={form.seniors} onChange={handleChange} required>
                {childrenOptions.map((seniorAge) => (
                  <option key={seniorAge} value={seniorAge}>{seniorAge}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('languageAndOrigin')}</h3>
          <div className="form-grid">
            <label>{t('preferredLanguage')}<input name="language" value={form.language} onChange={handleChange} /></label>
            <label>{t('countryOfBirth')}<input name="countryOfBirth" value={form.countryOfBirth} onChange={handleChange} /></label>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('income')}</h3>
          <div className="form-grid">
            <label>{t('incomeYear')}<input name="incomeYear" value={form.incomeYear} onChange={handleChange} /></label>
            <label>{t('incomeMonth')}<input name="incomeMonth" value={form.incomeMonth} onChange={handleChange} /></label>
            <label>{t('incomeWeek')}<input name="incomeWeek" value={form.incomeWeek} onChange={handleChange} /></label>
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
    </LocalizationProvider>
  );
}
