
import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './FormStyles_Green.css';
import logo from './ntfb_header_logo_retina.png';

const RegistrationForm = () => {
  const { t } = useTranslation();
  const sigCanvas = useRef({});
  const [form, setForm] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleClear = () => sigCanvas.current.clear();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    const formData = { ...form, signature: signatureData };
    try {
      await axios.post('/api/register', formData);
      alert(t('formSubmitted'));
    } catch (err) {
      console.error(err);
      alert(t('submitError'));
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <img src={logo} alt="Logo" />
        <h2>{t('registrationFormTitle')}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ... Existing sections ... */}

        {/* New: Household Crisis Eligibility */}
        <div className="form-section">
          <h3>{t('householdCrisisEligibility')}</h3>
          <label>
            {t('crisisPrompt')}
            <textarea
              name="crisisReason"
              value={form.crisisReason || ''}
              onChange={handleChange}
              rows="4"
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
            />
          </label>
        </div>

        {/* New: Certification Notice */}
        <div className="form-section">
          <h3>{t('certification')}</h3>
          <div style={{
            backgroundColor: '#f4f4f4',
            padding: '1rem',
            borderRadius: '6px',
            fontSize: '0.95rem',
            lineHeight: '1.5'
          }}>
            <p>1. {t('cert1')}</p>
            <p>2. {t('cert2')}</p>
            <p>3. {t('cert3')}</p>
          </div>
        </div>

        {/* Digital Signature */}
        <div className="form-section">
          <h3>{t('signature')}</h3>
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
          />
          <button type="button" onClick={handleClear}>{t('clearSignature')}</button>
        </div>

        <button type="submit">{t('submit')}</button>
      </form>
    </div>
  );
};

export default RegistrationForm;
