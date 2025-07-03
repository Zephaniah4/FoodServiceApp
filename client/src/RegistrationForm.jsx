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
    crisisReason: '', agreedToCert: false, nameOfProxy: ''
  });
  const [existingRegistration, setExistingRegistration] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isRenewal, setIsRenewal] = useState(false);
  const [showRenewalMessage, setShowRenewalMessage] = useState(false);

  // Ensure page starts at top on load/refresh
  useEffect(() => {
    // Force scroll to top when component mounts (page load/refresh)
    window.scrollTo(0, 0);
    
    // Also handle browser's scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Ensure scroll to top on page unload/refresh
    const handleBeforeUnload = () => {
      window.scrollTo(0, 0);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

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
      console.log('🔍 DUPLICATE CHECK - Starting duplicate detection...');
      console.log('🔍 DUPLICATE CHECK - Form Data:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth
      });

      // Ensure all required fields are present and not empty
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        console.log('🔍 DUPLICATE CHECK - Missing required fields, skipping duplicate check');
        return [];
      }

      // Normalize the data for comparison (trim whitespace, handle case)
      const normalizedFirstName = formData.firstName.trim();
      const normalizedLastName = formData.lastName.trim();
      const normalizedDateOfBirth = normalizeDateFormat(formData.dateOfBirth);

      console.log('🔍 DUPLICATE CHECK - Normalized data:', {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        dateOfBirth: normalizedDateOfBirth
      });

      // Since Firestore doesn't support case-insensitive queries, we'll fetch all records
      // and do case-insensitive matching in memory
      // For now, we'll do exact case-sensitive matching but could be enhanced later
      
      // Check for exact match by first name, last name, and date of birth (all 3 must match)
      const duplicateQuery = query(
        collection(db, 'registrations'),
        where('formData.firstName', '==', normalizedFirstName),
        where('formData.lastName', '==', normalizedLastName),
        where('formData.dateOfBirth', '==', normalizedDateOfBirth)
      );

      console.log('🔍 DUPLICATE CHECK - Query created, executing...');

      // Execute the query
      const queryResult = await getDocs(duplicateQuery);
      
      console.log('🔍 DUPLICATE CHECK - Query executed. Number of docs found:', queryResult.docs.length);

      if (queryResult.docs.length === 0) {
        console.log('🔍 DUPLICATE CHECK - No duplicates found');
        return [];
      }

      // Convert results to array
      const duplicates = [];
      queryResult.docs.forEach(doc => {
        const docData = doc.data();
        console.log('🔍 DUPLICATE CHECK - Found matching doc:', {
          id: doc.id,
          firstName: docData.formData?.firstName,
          lastName: docData.formData?.lastName,
          dateOfBirth: docData.formData?.dateOfBirth,
          submittedAt: docData.submittedAt
        });
        duplicates.push({ id: doc.id, ...docData });
      });

      console.log('🔍 DUPLICATE CHECK - Total duplicates found:', duplicates.length);

      // Return all duplicates (including archived registrations)
      return duplicates;
    } catch (error) {
      console.error('❌ DUPLICATE CHECK - Error checking for duplicates:', error);
      return [];
    }
  };

  // Function to handle updating an existing registration
  const updateExistingRegistration = async (existingReg, newFormData) => {
    console.log('🔄 updateExistingRegistration called with:');
    console.log('🔄 existingReg:', existingReg);
    console.log('🔄 newFormData:', newFormData);
    console.log('🔄 isRenewal:', isRenewal);
    
    try {
      // Validate inputs
      if (!existingReg) {
        throw new Error('existingReg is null or undefined');
      }
      
      if (!existingReg.id) {
        throw new Error('existingReg.id is missing');
      }
      
      if (!sigRef.current) {
        throw new Error('Signature canvas is not available');
      }
      
      const signature = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
      console.log('🔄 Signature captured successfully');
      
      // For TEFAP renewals, update the TEFAP date to current date
      // For regular updates, preserve existing TEFAP data
      let tefapDate, tefapEligible;
      
      if (isRenewal) {
        // This is a TEFAP renewal - update TEFAP date to current date
        tefapDate = new Date().toISOString().slice(0, 10);
        tefapEligible = existingReg.formData?.tefapEligible !== undefined ? existingReg.formData.tefapEligible : false;
        console.log('🔄 TEFAP Renewal - updating TEFAP date to:', tefapDate);
      } else {
        // Regular update - preserve existing TEFAP data
        tefapDate = existingReg.formData?.tefapDate || new Date().toISOString().slice(0, 10);
        tefapEligible = existingReg.formData?.tefapEligible !== undefined ? existingReg.formData.tefapEligible : false;
      }
      
      const formWithSignature = { 
        ...newFormData, 
        signature,
        tefapDate: tefapDate,
        tefapEligible: tefapEligible,
        // CRITICAL: Preserve the original Firestore document ID
        id: existingReg.formData?.id || existingReg.id
      };

      console.log('🔄 Preserving original ID:', existingReg.formData?.id || existingReg.id);
      console.log('🔄 Updating registration with document ID:', existingReg.id);
      console.log('🔄 Form data being saved:', formWithSignature);

      // Prepare the update data
      const updateData = {
        formData: formWithSignature,
        updatedAt: Timestamp.now(),
        originalSubmittedAt: existingReg.submittedAt // Preserve original submission date
      };

      // If this is a TEFAP renewal, also update the lastCheckIn timestamp
      if (isRenewal) {
        updateData.lastCheckIn = Timestamp.now();
        console.log('🔄 TEFAP Renewal - also updating lastCheckIn timestamp');
      }

      console.log('🔄 Complete update data being sent to Firestore:', updateData);
      console.log('🔄 About to call updateDoc with collection "registrations" and document ID:', existingReg.id);

      // Update the existing registration with new data (single update operation)
      await updateDoc(doc(db, 'registrations', existingReg.id), updateData);

      console.log('✅ Registration updated successfully with TEFAP date:', tefapDate);

      // If this is a TEFAP renewal, add them to the check-in queue
      if (isRenewal) {
        try {
          console.log('🔄 TEFAP Renewal - Adding to check-in queue');
          
          // Create a check-in record
          await addDoc(collection(db, 'checkins'), {
            registrationId: existingReg.id,
            checkInTime: Timestamp.now(),
            formData: {
              id: formWithSignature.id,
              firstName: formWithSignature.firstName,
              lastName: formWithSignature.lastName,
              household: parseInt(formWithSignature.children) + parseInt(formWithSignature.adults) + parseInt(formWithSignature.seniors)
            }
          });

          console.log('✅ TEFAP Renewal - Successfully added to check-in queue');
        } catch (checkInError) {
          console.error('❌ Error adding to check-in queue:', checkInError);
          console.error('❌ Check-in error details:', checkInError.message, checkInError.code);
          // Don't fail the whole process if check-in fails
        }
      }

      const successMessage = isRenewal 
        ? "TEFAP registration renewed successfully! You have been automatically checked in and added to the queue."
        : "Registration updated successfully with new information!";
      
      alert(successMessage);
      return true;
    } catch (error) {
      console.error("❌ Error updating registration - FULL ERROR DETAILS:");
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Full error object:", error);
      
      // More specific error message
      let userMessage = "An error occurred while updating the registration.";
      if (error.message.includes('permission')) {
        userMessage = "Permission denied. Please check your authentication.";
      } else if (error.message.includes('not-found')) {
        userMessage = "Registration not found. Please try again.";
      } else if (error.message.includes('network')) {
        userMessage = "Network error. Please check your connection and try again.";
      }
      
      alert(userMessage + " Check console for details.");
      return false;
    }
  };

  // Function to create a new registration
  const createNewRegistration = async (formData) => {
    try {
      if (!sigRef.current) {
        alert("Signature canvas not available. Please refresh the page and try again.");
        return false;
      }
      
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
      alert("An error occurred while submitting. Please try again.");
      return false;
    }
  };

  // Function to scroll to invalid field
  const scrollToField = (fieldName) => {
    console.log(`🔍 Scrolling to field: ${fieldName}`);
    
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
      let element = null;
      
      // Special cases for different field types
      if (fieldName === 'agreedToCert') {
        element = document.querySelector('input[name="agreedToCert"]');
      } else if (fieldName === 'signature') {
        element = document.querySelector('.sigCanvas') || document.querySelector('canvas');
      } else if (fieldName === 'dateOfBirth') {
        // Special handling for MUI DatePicker - try multiple selectors and target the container
        element = document.querySelector('.MuiInputBase-input') || 
                  document.querySelector('[data-testid="date-picker-field"] input') ||
                  document.querySelector('.MuiOutlinedInput-input') ||
                  document.querySelector('input[placeholder*="MM"]') ||
                  document.querySelector('div[class*="MuiFormControl"] input');
        
        // If we found an input, also try to get its parent container for better styling
        if (element) {
          const container = element.closest('.MuiInputBase-root') || 
                           element.closest('.MuiOutlinedInput-root') || 
                           element.closest('.MuiFormControl-root');
          if (container) {
            // Apply styling to both the input and its container
            element.muiContainer = container;
          }
        }
      } else {
        // Try multiple strategies to find the field
        element = document.querySelector(`input[name="${fieldName}"]`) ||
                  document.querySelector(`select[name="${fieldName}"]`) ||
                  document.querySelector(`textarea[name="${fieldName}"]`) ||
                  // Try by ID if name doesn't work
                  document.querySelector(`#${fieldName}`) ||
                  // Try to find the label and then the associated input
                  (() => {
                    const labels = document.querySelectorAll('label');
                    for (const label of labels) {
                      const input = label.querySelector(`input[name="${fieldName}"], select[name="${fieldName}"], textarea[name="${fieldName}"]`);
                      if (input) return input;
                    }
                    return null;
                  })();
      }
      
      if (!element) {
        console.error(`❌ Element not found for field: ${fieldName}`);
        console.log('Available form fields:', Array.from(document.querySelectorAll('input, select, textarea')).map(el => el.name || el.id || el.className));
        
        // Fallback: try to find any field with the name in its attributes
        const allInputs = document.querySelectorAll('input, select, textarea');
        for (const input of allInputs) {
          if (input.name === fieldName || input.id === fieldName) {
            element = input;
            console.log(`✅ Found element using fallback method:`, element);
            break;
          }
        }
        
        if (!element) {
          alert(`Cannot find the field "${fieldName}" on the form. Please check the form manually.`);
          return;
        }
      }
      
      console.log(`✅ Found element for field: ${fieldName}`, element);
      
      // Try to detect the actual navigation bar height
      let navBarHeight = 150; // Default fallback for better clearance
      
      // Try different possible nav bar selectors
      const possibleNavSelectors = [
        'nav', '.navbar', '.nav-bar', '.navigation', '.header-nav', 
        '.main-nav', '[role="navigation"]', '.app-header', '.site-header'
      ];
      
      for (const selector of possibleNavSelectors) {
        const navElement = document.querySelector(selector);
        if (navElement) {
          const navRect = navElement.getBoundingClientRect();
          if (navRect.height > 0) {
            navBarHeight = Math.max(navBarHeight, navRect.height + 80); // Add 80px padding for better clearance
            console.log(`Found nav element with selector "${selector}", height: ${navRect.height}px`);
            break;
          }
        }
      }
      
      // Get the element's position
      const elementRect = element.getBoundingClientRect();
      const elementTop = elementRect.top + window.pageYOffset;
      
      console.log(`📐 Element position: top=${elementRect.top}px, absolute=${elementTop}px`);
      console.log(`📏 Nav bar height: ${navBarHeight}px`);
      
      // Use the detected or larger fallback offset
      const targetPosition = elementTop - navBarHeight;
      const finalPosition = Math.max(0, targetPosition);
      
      console.log(`🎯 Target scroll position: ${finalPosition}px`);
      
      // Scroll to the field with smooth behavior
      window.scrollTo({
        top: finalPosition,
        behavior: 'smooth'
      });
      
      // Focus the element if it's focusable
      if (element.focus) {
        setTimeout(() => {
          element.focus();
          console.log('🎯 Element focused');
        }, 500); // Allow time for scroll to complete
      }
      
      // Add red border to highlight the invalid field
      if (fieldName === 'dateOfBirth' && element.muiContainer) {
        // For MUI DatePicker, style both the input and container
        element.style.border = '4px solid #ff0000';
        element.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.8)';
        element.muiContainer.style.border = '4px solid #ff0000';
        element.muiContainer.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.8)';
        element.muiContainer.style.outline = '2px solid #ff0000';
        element.muiContainer.style.outlineOffset = '2px';
      } else {
        // Standard styling for other fields
        element.style.border = '4px solid #ff0000';
        element.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.8)';
        element.style.outline = '2px solid #ff0000';
        element.style.outlineOffset = '2px';
      }
      console.log('🔴 Added red border to invalid field');
      
      // Add event listener to remove red border when user starts typing/selecting
      const removeRedBorder = () => {
        element.style.border = '';
        element.style.boxShadow = '';
        element.style.outline = '';
        element.style.outlineOffset = '';
        
        // Also remove styling from MUI container if it exists
        if (fieldName === 'dateOfBirth' && element.muiContainer) {
          element.muiContainer.style.border = '';
          element.muiContainer.style.boxShadow = '';
          element.muiContainer.style.outline = '';
          element.muiContainer.style.outlineOffset = '';
        }
        
        element.removeEventListener('input', removeRedBorder);
        element.removeEventListener('change', removeRedBorder);
        element.removeEventListener('focus', removeRedBorder);
        element.removeEventListener('click', removeRedBorder);
        console.log('✅ Removed red border from field');
      };
      
      element.addEventListener('input', removeRedBorder);
      element.addEventListener('change', removeRedBorder);
      element.addEventListener('focus', removeRedBorder);
      element.addEventListener('click', removeRedBorder); // Add click for date picker
      
    }, 100); // Small delay to ensure DOM is ready
  };

  // Function to normalize date format for comparison
  const normalizeDateFormat = (dateString) => {
    if (!dateString) return '';
    
    // Handle different possible date formats
    try {
      // If it's already in MM-DD-YYYY format, return as is
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      // If it's in other format, try to parse and convert
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
      }
      
      // If parsing failed, return original string
      return dateString;
    } catch (error) {
      console.warn('Date normalization failed for:', dateString, error);
      return dateString;
    }
  };

  const handleSubmit = async (e) => {
    console.log('🚨 FORM SUBMIT TRIGGERED!', e);
    console.log('📋 Current form state:', form);
    
    // Prevent default behavior FIRST to ensure form doesn't try to submit normally
    e.preventDefault();
    e.stopPropagation();
    console.log('✅ preventDefault called');

    try {
      // Validate required fields
      const requiredFields = [
        'firstName', 'lastName', 'dateOfBirth', 'phone', 'address',
        'city', 'state', 'zipCode', 'race', 'ethnicity', 'sex', 'maritalStatus',
        'children', 'adults', 'seniors'
      ];
      
      console.log('🔍 Starting validation...');
      
      for (const field of requiredFields) {
        const value = form[field];
        console.log(`Checking field ${field}:`, value);
        
        // For numeric fields (children, adults, seniors), ensure they have a valid number
        if (['children', 'adults', 'seniors'].includes(field)) {
          if (value === '' || value === null || value === undefined) {
            console.log(`❌ Validation failed for numeric field: ${field}`);
            scrollToField(field);
            // Small delay to allow scroll to complete before showing alert
            setTimeout(() => {
              alert(`Please fill out the required field: ${field.charAt(0).toUpperCase() + field.slice(1)}`);
            }, 600);
            return;
          }
        } else {
          // For other fields, check if they're empty
          if (value === '' || value === null || value === undefined) {
            console.log(`❌ Validation failed for field: ${field}`);
            scrollToField(field);
            // Small delay to allow scroll to complete before showing alert
            setTimeout(() => {
              alert(`Please fill out the required field: ${field.charAt(0).toUpperCase() + field.slice(1)}`);
            }, 600);
            return;
          }
        }
      }

      console.log('✅ All required fields validated');

      // Separate validation for checkbox
      if (!form.agreedToCert) {
        console.log('❌ Certification agreement validation failed');
        scrollToField('agreedToCert');
        // Small delay to allow scroll to complete before showing alert
        setTimeout(() => {
          alert('Please agree to the certification to continue.');
        }, 600);
        return;
      }

      console.log('✅ Certification agreement validated');

      // Validate signature is present
      if (!sigRef.current) {
        console.log('❌ Signature validation failed - sigRef.current is null');
        alert('Signature canvas not available. Please refresh the page and try again.');
        return;
      }
      
      if (sigRef.current.isEmpty()) {
        console.log('❌ Signature validation failed - signature is empty');
        scrollToField('signature');
        // Small delay to allow scroll to complete before showing alert
        setTimeout(() => {
          alert('Please provide your signature.');
        }, 600);
        return;
      }

      console.log('✅ Signature validated');

      // Handle TEFAP renewals differently - we know exactly which registration to update
      if (isRenewal) {
        console.log('🔄 TEFAP Renewal detected - bypassing duplicate check and updating directly');
        
        // For TEFAP renewals, we should have stored the original registration data
        const originalRegistrationData = sessionStorage.getItem('currentRegistrationData');
        if (originalRegistrationData) {
          try {
            const originalReg = JSON.parse(originalRegistrationData);
            console.log('🔄 Found original registration data for renewal:', originalReg.formData?.id);
            
            const success = await updateExistingRegistration(originalReg, form);
            if (success) {
              // Clear the stored registration data
              sessionStorage.removeItem('currentRegistrationData');
              resetForm();
            }
            return;
          } catch (parseError) {
            console.error('Error parsing original registration data:', parseError);
            // Fall back to duplicate check if we can't parse the stored data
          }
        } else {
          console.warn('⚠️ TEFAP Renewal detected but no original registration data found in sessionStorage');
          // Fall back to duplicate check
        }
      }

      // Check for duplicate registrations (for regular registrations or fallback)
      let duplicates = [];
      try {
        duplicates = await checkForDuplicates(form);
      } catch (duplicateError) {
        console.error('Error checking for duplicates:', duplicateError);
        // Continue with registration if duplicate check fails
      }
      
      if (duplicates.length > 0) {
        if (isRenewal) {
          // This is a TEFAP renewal fallback - automatically update the existing registration
          console.log('🔄 TEFAP Renewal fallback - automatically updating existing registration');
          const success = await updateExistingRegistration(duplicates[0], form);
          if (success) {
            resetForm();
          }
          return;
        } else {
          // Found potential duplicates - show dialog to user for regular registrations
          setExistingRegistration(duplicates[0]); // Use the first match
          setShowDuplicateDialog(true);
          return;
        }
      }

      // No duplicates found, proceed with new registration
      const success = await createNewRegistration(form);
      if (success) {
        resetForm();
      }
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      alert('An error occurred during form submission. Check the console for details.');
    }
  };

  // Clear signature function
  const clearSignature = () => {
    if (sigRef.current) {
      sigRef.current.clear();
    }
  };

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', dateOfBirth: '', phone: '', address: '',
      apartment: '', city: '', state: '', zipCode: '', race: '', ethnicity: '', sex: '', maritalStatus: '',
      children: '0', adults: '0', seniors: '0', language: '', countryOfBirth: '',
      incomeYear: '', incomeMonth: '', incomeWeek: '',
      snap: false, tanf: false, ssi: false, nsls: false, medicaid: false,
      crisisReason: '', agreedToCert: false, nameOfProxy: ''
    });
    sigRef.current.clear();
    setExistingRegistration(null);
    setShowDuplicateDialog(false);
    setIsRenewal(false); // Reset renewal state
    setShowRenewalMessage(false); // Reset renewal message state
    
    // Scroll to top of page after successful submission
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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
      <form 
        className="form-container" 
        onSubmit={handleSubmit}
        onSubmitCapture={(e) => {
          console.log('📝 Form onSubmitCapture fired:', e);
        }}
        noValidate
      >
        
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
              <input name="firstName" value={form.firstName} onChange={handleChange} />
            </label>
            <label>{t('lastName')}
              <input name="lastName" value={form.lastName} onChange={handleChange} />
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
              />
            </label>
            <label>{t('address')}
              <input name="address" value={form.address} onChange={handleChange} />
            </label>
            <label>{t('apartment')}
              <input name="apartment" value={form.apartment} onChange={handleChange} />
            </label>
            <label>{t('city')}
              <input name="city" value={form.city} onChange={handleChange} />
            </label>
            <label>{t('state')}
              <select name="state" value={form.state} onChange={handleChange}>
                {usStates.map((state) => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
            </label>
            <label>{t('zip')}
              <input name="zipCode" value={form.zipCode} onChange={handleChange} />
            </label>
            <label>{t('race')}
              <select name="race" value={form.race} onChange={handleChange}>
                <option value="">{t('selectRace')}</option>
                <option value="Caucasian">{t('Caucasian')}</option>
                <option value="Black">{t('Black')}</option>
                <option value="Latino">{t('Latino')}</option>
                <option value="Asian">{t('Asian')}</option>
                <option value="Native">{t('Native')}</option>
                <option value="Other">{t('Other')}</option>
              </select>
            </label>
            <label>{t('ethnicity')}
              <select name="ethnicity" value={form.ethnicity} onChange={handleChange}>
                <option value="">{t('selectEthnicity')}</option>
                <option value="Hispanic">{t('Hispanic')}</option>
                <option value="Non-Hispanic">{t('Non-Hispanic')}</option>
              </select>
            </label>
            <label>{t('sex')}
              <select name="sex" value={form.sex} onChange={handleChange}>
                <option value="">{t('selectSex')}</option>
                <option value="Male">{t('Male')}</option>
                <option value="Female">{t('Female')}</option>
              </select>
            </label>
            <label>{t('maritalStatus')}
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange}>
                <option value="">{t('selectMaritalStatus')}</option>
                <option value="Single">{t('Single')}</option>
                <option value="Married">{t('Married')}</option>
                <option value="Divorced">{t('Divorced')}</option>
                <option value="Widowed">{t('Widowed')}</option>
              </select>
            </label>
            <label>{t('nameOfProxy')}
              <input name="nameOfProxy" value={form.nameOfProxy} onChange={handleChange} />
            </label>
          </div> {/* Close form-grid here */}
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
          <h3>{t('household')}</h3>
          <div className="form-grid">
            <label>{t('children')}
              <select name="children" value={form.children} onChange={handleChange}>
                {childrenOptions.map((childAge) => (
                  <option key={childAge} value={childAge.toString()}>{childAge}</option>
                ))}
              </select>
            </label>
            <label>{t('adults')}
              <select name="adults" value={form.adults} onChange={handleChange}>
                {childrenOptions.map((adultAge) => (
                  <option key={adultAge} value={adultAge.toString()}>{adultAge}</option>
                ))}
              </select>
            </label>
            <label>{t('seniors')}
              <select name="seniors" value={form.seniors} onChange={handleChange}>
                {childrenOptions.map((seniorAge) => (
                  <option key={seniorAge} value={seniorAge.toString()}>{seniorAge}</option>
                ))}
              </select>
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
            clearOnResize={false}
          />
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center', 
          alignItems: 'baseline',
          marginTop: '2rem',
          marginBottom: '2rem' 
        }}>
          <button 
            type="submit"
            style={{
              padding: '0',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '150px',
              height: '48px',
              lineHeight: '48px',
              textAlign: 'center',
              boxSizing: 'border-box',
              verticalAlign: 'top'
            }}
          >
            {t('submit')}
          </button>
          <button 
            type="button" 
            onClick={clearSignature}
            style={{
              padding: '0',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '150px',
              height: '48px',
              lineHeight: '48px',
              textAlign: 'center',
              boxSizing: 'border-box',
              verticalAlign: 'top'
            }}
          >
            {t('clearSignature')}
          </button>
        </div>
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
                  <div><strong>First Name:</strong> {existingRegistration.formData?.firstName}</div>
                  <div><strong>Last Name:</strong> {existingRegistration.formData?.lastName}</div>
                  <div><strong>Address:</strong> {existingRegistration.formData?.address}, {existingRegistration.formData?.city}</div>
                  <div><strong>Submitted:</strong> {existingRegistration.submittedAt && typeof existingRegistration.submittedAt.toDate === "function" 
                    ? existingRegistration.submittedAt.toDate().toLocaleDateString() 
                    : 'Unknown'}</div>
                </div>
              </div>

              <div className="new-info">
                <h3>New Registration:</h3>
                <div className="info-grid">
                  <div><strong>First Name:</strong> {form.firstName}</div>
                  <div><strong>Last Name:</strong> {form.lastName}</div>
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
