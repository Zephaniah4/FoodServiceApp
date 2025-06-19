import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import i18n from './i18n';
import { useTranslation } from 'react-i18next';
import './FormStyles_Green.css';
import logo from './ntfb_header_logo_retina.png';

export default function RegistrationForm() {
  const { t } = useTranslation();
  const sigRef = useRef();
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', phone: '', address: '',
    apartment: '', zipCode: '', ethnicity: '', sex: '', maritalStatus: '',
    children: '', adults: '', seniors: '', language: '', countryOfBirth: '',
    incomeYear: '', incomeMonth: '', incomeWeek: '',
    snap: false, tanf: false, ssi: false, nsls: false, medicaid: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const signature = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    await axios.post('http://localhost:3001/register', { ...form, signature });
    alert(t('submittedSuccessfully'));
  };

  return (
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
        <div className="form-grid">
          <label>{t('firstName')}<input name="firstName" value={form.firstName} onChange={handleChange} /></label>
          <label>{t('lastName')}<input name="lastName" value={form.lastName} onChange={handleChange} /></label>
          <label>{t('dob')}<input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} /></label>
          <label>{t('phone')}<input name="phone" value={form.phone} onChange={handleChange} /></label>
          <label>{t('address')}<input name="address" value={form.address} onChange={handleChange} /></label>
          <label>{t('apartment')}<input name="apartment" value={form.apartment} onChange={handleChange} /></label>
          <label>{t('zip')}<input name="zipCode" value={form.zipCode} onChange={handleChange} /></label>
          <label>{t('ethnicity')}<input name="ethnicity" value={form.ethnicity} onChange={handleChange} /></label>
          <label>{t('sex')}<input name="sex" value={form.sex} onChange={handleChange} /></label>
          <label>{t('maritalStatus')}<input name="maritalStatus" value={form.maritalStatus} onChange={handleChange} /></label>
        </div>
      </div>

      <div className="form-section">
        <h3>{t('household')}</h3>
        <div className="form-grid">
          <label>{t('children')}<input name="children" value={form.children} onChange={handleChange} /></label>
          <label>{t('adults')}<input name="adults" value={form.adults} onChange={handleChange} /></label>
          <label>{t('seniors')}<input name="seniors" value={form.seniors} onChange={handleChange} /></label>
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


      <div className="form-section">
        <h3>{t('signature')}</h3>
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{ width: 300, height: 100, className: 'sigCanvas' }}
        />
      </div>

      <button type="submit">{t('submit')}</button>
    </form>
  );
}
