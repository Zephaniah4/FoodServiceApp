import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, where, getDocs, limit, deleteDoc } from "firebase/firestore";
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../hooks/useDebounce';
import StaffSignaturePad from './StaffSignaturePad';
import "../AdminViewer.css";
import "../FormStyles_Green.css";
import logo from '../ntfb_header_logo_retina.png';
import AdminViewer from "../AdminViewer";

function DatabaseManager() {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedIds, setEditedIds] = useState({});
  const [editedHouseholds, setEditedHouseholds] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [householdEditorOpen, setHouseholdEditorOpen] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [adminFields, setAdminFields] = useState({});
  const [showStaffSignaturePad, setShowStaffSignaturePad] = useState(null);
  const [editedTefap, setEditedTefap] = useState({});
  const [editedFormFields, setEditedFormFields] = useState({});
  const [editedLocations, setEditedLocations] = useState({});
  const [selectedRegistrations, setSelectedRegistrations] = useState({});
  const [batchTefapDate, setBatchTefapDate] = useState('');
  const [batchLocation, setBatchLocation] = useState('');
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  
  // New state variables for sorting and search
  const [sortField, setSortField] = useState('submittedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const selectedIds = useMemo(() => (
    Object.entries(selectedRegistrations)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id)
  ), [selectedRegistrations]);
  const selectedCount = selectedIds.length;
  const isBatchApplyDisabled = isApplyingBatch || selectedCount === 0 || (!batchTefapDate && !batchLocation);

  // Database pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Records per page
  // OPTIMIZED: Memoized filtering with debounced search (placed after all state to avoid conditional hooks)
  const filteredRegistrations = useMemo(() => {
    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    
    return registrations
      .filter(reg => {
        // Name filtering (only if filter is set)
        if (firstNameFilter && !reg.formData.firstName?.toLowerCase().includes(firstNameFilter.toLowerCase())) {
          return false;
        }
        if (lastNameFilter && !reg.formData.lastName?.toLowerCase().includes(lastNameFilter.toLowerCase())) {
          return false;
        }
        
        // Search functionality (only if search term exists)
        if (searchLower) {
          const fullName = `${reg.formData?.firstName || ''} ${reg.formData?.lastName || ''}`.toLowerCase();
          const phone = (reg.formData?.phone || '').toLowerCase();
          const address = (reg.formData?.address || '').toLowerCase();
          const city = (reg.formData?.city || '').toLowerCase();
          const id = (reg.formData?.id || reg.id || '').toLowerCase();
          const dateOfBirth = (reg.formData?.dateOfBirth || '').toLowerCase();
          
          const searchMatch = fullName.includes(searchLower) || 
                             phone.includes(searchLower) || 
                             address.includes(searchLower) ||
                             city.includes(searchLower) ||
                             id.includes(searchLower) ||
                             dateOfBirth.includes(searchLower);
          
          if (!searchMatch) return false;
        }
        
        return true;
      });
  }, [registrations, firstNameFilter, lastNameFilter, debouncedSearchTerm]);

  // OPTIMIZED: Memoized sorting
  const sortedAndFilteredRegistrations = useMemo(() => {
    return [...filteredRegistrations]
      .sort((a, b) => {
        // Sorting logic
        let aValue, bValue;
        
        switch (sortField) {
          case 'name':
            aValue = `${a.formData?.firstName || ''} ${a.formData?.lastName || ''}`.toLowerCase();
            bValue = `${b.formData?.firstName || ''} ${b.formData?.lastName || ''}`.toLowerCase();
            break;
          case 'id':
            aValue = a.formData?.id || '';
            bValue = b.formData?.id || '';
            break;
          case 'dateOfBirth':
            aValue = a.formData?.dateOfBirth || '';
            bValue = b.formData?.dateOfBirth || '';
            break;
          case 'phone':
            aValue = a.formData?.phone || '';
            bValue = b.formData?.phone || '';
            break;
          case 'address':
            aValue = a.formData?.address || '';
            bValue = b.formData?.address || '';
            break;
          case 'submittedAt':
          default:
            aValue = a.submittedAt?.toDate() || new Date(0);
            bValue = b.submittedAt?.toDate() || new Date(0);
            break;
        }
        
        if (sortField === 'submittedAt') {
          // For dates, compare as Date objects
          if (sortDirection === 'asc') {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        } else {
          // For strings, use localeCompare
          if (sortDirection === 'asc') {
            return aValue.toString().localeCompare(bValue.toString());
          } else {
            return bValue.toString().localeCompare(aValue.toString());
          }
        }
      });
  }, [filteredRegistrations, sortField, sortDirection]);

  // Helper function to convert date from MM-DD-YYYY to YYYY-MM-DD format for HTML date input
  const convertDateForInput = (dateString) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If in MM-DD-YYYY format, convert to YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split('-');
      return `${year}-${month}-${day}`;
    }
    
    // Try to parse other formats
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Date conversion failed for:', dateString);
    }
    
    return dateString; // Return original if conversion fails
  };

  // Helper function to convert date from YYYY-MM-DD back to MM-DD-YYYY format for storage
  const convertDateForStorage = (dateString) => {
    if (!dateString) return '';
    
    // If already in MM-DD-YYYY format, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // If in YYYY-MM-DD format, convert to MM-DD-YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${month}-${day}-${year}`;
    }
    
    return dateString; // Return original if conversion fails
  };

  // DATABASE MANAGER: Proper data fetching that can access ALL registrations with search and filtering
  const fetchAllRegistrations = useCallback(async () => {
    setLoading(true);
    
    try {
      // Build base query for database manager
      let q = query(
        collection(db, "registrations"),
        orderBy("submittedAt", "desc")
      );
      
      // Since showArchived now controls database vs live queue:
      // When showArchived = false (unchecked), show ALL registrations in database
      // When showArchived = true (checked), we're in live queue mode - fetch all for potential search
      // No archive filtering needed - show all registrations in database mode
      
      // Add date range filtering at DATABASE level if dates are set
      if (startDate) {
        const startDateTime = new Date(startDate);
        q = query(q, where("submittedAt", ">=", startDateTime));
      }
      
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1); // Include the entire end date
        q = query(q, where("submittedAt", "<", endDateTime));
      }
      
      // Execute query to get ALL matching records
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`DatabaseManager: Loaded ${data.length} registrations from Firebase`);
      setRegistrations(data);
      // Total records are now calculated from displayData.length
      
    } catch (error) {
      console.error("DatabaseManager: Firebase query error:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // For Database Manager, use the filtered and sorted data with client-side pagination
  const displayData = sortedAndFilteredRegistrations;

  // Client-side pagination for the filtered results
  const totalPages = Math.ceil(displayData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = displayData.slice(startIndex, endIndex);
  const isAllCurrentPageSelected = paginatedData.length > 0 && paginatedData.every(reg => selectedRegistrations[reg.id]);

  useEffect(() => {
    if (!selectAllCheckboxRef.current) return;
    const someSelected = paginatedData.some(reg => selectedRegistrations[reg.id]);
    selectAllCheckboxRef.current.indeterminate = someSelected && !isAllCurrentPageSelected;
  }, [paginatedData, selectedRegistrations, isAllCurrentPageSelected]);

  // Client-side pagination functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Initial data load and when filters change
  useEffect(() => {
    fetchAllRegistrations();
    setCurrentPage(1); // Reset to first page when filters change
  }, [fetchAllRegistrations]);

  const previousShowArchived = useRef(showArchived);
  const selectAllCheckboxRef = useRef(null);
  useEffect(() => {
    if (previousShowArchived.current && !showArchived) {
      fetchAllRegistrations();
    }
    previousShowArchived.current = showArchived;
  }, [showArchived, fetchAllRegistrations]);

  // Reset to first page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, firstNameFilter, lastNameFilter]);

  // Reset to first page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Real-time listener for registrations - OPTIMIZED with limits and date filtering
  useEffect(() => {
    // Only fetch recent registrations (last 30 days) unless showing archived
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let q;
    if (showArchived) {
      // For archived view, get all but limit to 500 most recent
      q = query(
        collection(db, "registrations"),
        orderBy("submittedAt", "desc"),
        limit(500)
      );
    } else {
      // For active view, get recent registrations and filter out archived ones in memory
      // This avoids the need for a composite index
      q = query(
        collection(db, "registrations"),
        orderBy("submittedAt", "desc"),
        limit(300) // Get more records to account for filtering
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // If showing active registrations, filter out archived ones in memory
      if (!showArchived) {
        data = data.filter(reg => !reg.formData?.archived);
        // Limit to 200 after filtering
        data = data.slice(0, 200);
      }
      
      setRegistrations(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching registrations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showArchived]); // Re-run when archive filter changes


  const toggleSelectRegistration = (regId) => {
    setSelectedRegistrations(prev => {
      const updated = { ...prev };
      if (updated[regId]) {
        delete updated[regId];
      } else {
        updated[regId] = true;
      }
      return updated;
    });
  };

  const handleSelectAllCurrentPage = (checked) => {
    setSelectedRegistrations(prev => {
      const updated = { ...prev };
      paginatedData.forEach(reg => {
        if (checked) {
          updated[reg.id] = true;
        } else {
          delete updated[reg.id];
        }
      });
      return updated;
    });
  };

  const clearBatchSelection = () => {
    setSelectedRegistrations({});
  };

  const handleBatchFieldReset = () => {
    setBatchTefapDate('');
    setBatchLocation('');
  };

  // Applies TEFAP date and/or site updates to selected registrations.
  const applyBatchUpdates = async () => {
    if (selectedIds.length === 0) {
      setSaveMessage("Select at least one registration to apply batch updates.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    if (!batchTefapDate && !batchLocation) {
      setSaveMessage("Set a TEFAP date or choose a site before applying.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setIsApplyingBatch(true);

    try {
      for (const regId of selectedIds) {
        const registration = registrations.find(reg => reg.id === regId);
        if (!registration) continue;

        const updateData = {};
        if (batchTefapDate) {
          updateData["formData.tefapDate"] = batchTefapDate;
        }

        if (batchLocation) {
          updateData["formData.location"] = batchLocation;
        }

        if (Object.keys(updateData).length > 0) {
          await updateDoc(doc(db, "registrations", regId), updateData);
        }

        if (batchLocation) {
          const userId = registration.formData?.id || registration.id;
          try {
            const checkinsSnapshot = await getDocs(query(
              collection(db, "checkins"),
              where("userId", "==", userId)
            ));

            const checkinUpdates = checkinsSnapshot.docs.map(d =>
              updateDoc(doc(db, "checkins", d.id), {
                location: batchLocation,
                "formData.location": batchLocation
              })
            );

            if (checkinUpdates.length) {
              await Promise.all(checkinUpdates);
            }
          } catch (error) {
            console.error("Error updating check-ins during batch location update:", error);
          }
        }
      }

      if (batchTefapDate) {
        setEditedTefap(prev => {
          const updated = { ...prev };
          selectedIds.forEach(id => delete updated[id]);
          return updated;
        });
      }

      if (batchLocation) {
        setEditedLocations(prev => {
          const updated = { ...prev };
          selectedIds.forEach(id => delete updated[id]);
          return updated;
        });
      }

  handleBatchFieldReset();
      setSelectedRegistrations({});
      await fetchAllRegistrations();
      setSaveMessage(`Batch update applied to ${selectedIds.length} registration${selectedIds.length !== 1 ? 's' : ''}!`);
    } catch (error) {
      console.error("Error applying batch updates:", error);
      setSaveMessage("Error applying batch updates. Please try again.");
    } finally {
      setIsApplyingBatch(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const handleIdChange = (docId, newId) => {
    setEditedIds(prev => ({ ...prev, [docId]: newId }));
  };

  const handleHouseholdChange = (docId, value) => {
    setEditedHouseholds(prev => ({ ...prev, [docId]: value }));
  };

  const handleTefapChange = (docId, field, value) => {
    setEditedTefap(prev => ({ 
      ...prev, 
      [docId]: { 
        ...prev[docId], 
        [field]: value 
      } 
    }));
  };

  const handleLocationChange = (docId, location) => {
    setEditedLocations(prev => ({ ...prev, [docId]: location }));
  };

  const saveLocation = async (regDocId, userId, currentLocation) => {
    const newLocation = editedLocations[regDocId] !== undefined ? editedLocations[regDocId] : currentLocation || "";

    try {
      // Update the registration
      await updateDoc(doc(db, "registrations", regDocId), {
        "formData.location": newLocation
      });

      // Update in all checkins for this user
      const checkinsQuery = query(
        collection(db, "checkins"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(checkinsQuery);
      
      const updates = snapshot.docs.map(d => {
        return updateDoc(doc(db, "checkins", d.id), {
          location: newLocation,
          "formData.location": newLocation
        });
      });
      await Promise.all(updates);

      setSaveMessage("Location saved successfully!");
      setEditedLocations(prev => {
        const updated = { ...prev };
        delete updated[regDocId];
        return updated;
      });
      setSelectedRegistrations(prev => {
        if (!prev[regDocId]) return prev;
        const updated = { ...prev };
        delete updated[regDocId];
        return updated;
      });
      await fetchAllRegistrations();
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving location:", error);
      setSaveMessage("Error saving location!");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  // Enhanced household management functions
  const toggleHouseholdEditor = (regId) => {
    setHouseholdEditorOpen(prev => ({ ...prev, [regId]: !prev[regId] }));
  };

  const initializeHouseholdData = (regId, currentHousehold) => {
    if (!editedHouseholds[regId]) {
      let householdData = [];
      try {
        // Try to parse existing household data if it's JSON
        if (currentHousehold && typeof currentHousehold === 'string' && currentHousehold.startsWith('[')) {
          householdData = JSON.parse(currentHousehold);
        } else if (currentHousehold) {
          // Convert simple string to array format
          householdData = [{ type: 'other', value: currentHousehold }];
        }
      } catch (e) {
        // If parsing fails, treat as simple string
        householdData = currentHousehold ? [{ type: 'other', value: currentHousehold }] : [];
      }
      
      // Ensure we have 6 slots
      while (householdData.length < 6) {
        householdData.push({ type: '', value: '' });
      }
      
      setEditedHouseholds(prev => ({ ...prev, [regId]: householdData }));
    }
  };

  const updateHouseholdEntry = (regId, index, field, value) => {
    setEditedHouseholds(prev => {
      const updated = [...(prev[regId] || [])];
      if (!updated[index]) updated[index] = { type: '', value: '' };
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [regId]: updated };
    });
  };

  // Admin field management functions
  const handleAdminFieldChange = (regId, field, value) => {
    setAdminFields(prev => ({
      ...prev,
      [regId]: {
        ...prev[regId],
        [field]: value
      }
    }));
  };

  const initializeAdminFields = (regId, registration) => {
    if (!adminFields[regId]) {
      const existingAdminData = registration.adminData || {};
      setAdminFields(prev => ({
        ...prev,
        [regId]: {
          isEligible: existingAdminData.isEligible || false,
          isIneligible: existingAdminData.isIneligible || false,
          eligibleBeginMonth: existingAdminData.eligibleBeginMonth || '',
          eligibleBeginYear: existingAdminData.eligibleBeginYear || '',
          eligibleEndMonth: existingAdminData.eligibleEndMonth || '',
          eligibleEndYear: existingAdminData.eligibleEndYear || '',
          ineligibleBeginMonth: existingAdminData.ineligibleBeginMonth || '',
          ineligibleBeginYear: existingAdminData.ineligibleBeginYear || '',
          ineligibleEndMonth: existingAdminData.ineligibleEndMonth || '',
          ineligibleEndYear: existingAdminData.ineligibleEndYear || '',
          staffSignature: existingAdminData.staffSignature || '',
          staffDate: existingAdminData.staffDate || ''
        }
      }));
      
      // Auto-populate signature from saved admin signature if not already present
      if (!existingAdminData.staffSignature) {
        loadSavedStaffSignature(regId, 'admin');
      }
    }
  };

  // Load saved staff signature for the current admin user
  const loadSavedStaffSignature = async (regId, adminEmail) => {
    try {
      // First, check localStorage for a cached signature
      const cachedSignature = localStorage.getItem(`staffSignature_${adminEmail}`);
      if (cachedSignature) {
        handleAdminFieldChange(regId, 'staffSignature', cachedSignature);
        return;
      }

      // If not in cache, look for the most recent signature from this admin user
      const recentSignatureQuery = query(
        collection(db, "registrations"),
        where("adminData.updatedBy", "==", adminEmail),
        orderBy("adminData.lastUpdated", "desc"),
        limit(1)
      );
      
      const snapshot = await getDocs(recentSignatureQuery);
      if (!snapshot.empty) {
        const mostRecentReg = snapshot.docs[0].data();
        if (mostRecentReg.adminData?.staffSignature) {
          // Cache the signature for faster future loading
          localStorage.setItem(`staffSignature_${adminEmail}`, mostRecentReg.adminData.staffSignature);
          handleAdminFieldChange(regId, 'staffSignature', mostRecentReg.adminData.staffSignature);
        }
      }
    } catch (error) {
      console.error("Error loading saved staff signature:", error);
    }
  };

  // Save staff signature to cache when a new one is created
  const saveStaffSignatureToCache = (signatureData) => {
    if (signatureData) {
      localStorage.setItem(`staffSignature_admin`, signatureData);
    }
  };

  const saveAdminFields = async (regId) => {
    const fieldsToSave = adminFields[regId];
    if (!fieldsToSave) return;

    try {
      await updateDoc(doc(db, "registrations", regId), {
        "adminData": fieldsToSave,
        "adminData.lastUpdated": new Date().toISOString(),
        "adminData.updatedBy": 'admin'
      });
      setSaveMessage("Admin fields saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving admin fields:", error);
      setSaveMessage("Error saving admin fields!");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const searchRegistrationById = async (searchId) => {
    if (!searchId) return [];
    try {
      const searchQuery = query(
        collection(db, "registrations"),
        where("formData.id", "==", searchId)
      );
      const snapshot = await getDocs(searchQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        registrationId: doc.data().formData?.id,
        name: `${doc.data().formData?.firstName || ''} ${doc.data().formData?.lastName || ''}`.trim(),
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error searching registrations:', error);
      return [];
    }
  };

  const handleRegistrationSearch = async (regId, index, searchId) => {
    if (searchId.length >= 2) {
      const results = await searchRegistrationById(searchId);
      setSearchResults(prev => ({ 
        ...prev, 
        [`${regId}-${index}`]: results 
      }));
    } else {
      setSearchResults(prev => ({ 
        ...prev, 
        [`${regId}-${index}`]: [] 
      }));
    }
  };

  const saveId = async (docId, currentId) => {
    const newId = editedIds[docId] ?? currentId;
    
    // Update the registration first
    await updateDoc(doc(db, "registrations", docId), {
      "formData.id": newId
    });
    
    // Get the full registration data for syncing
    const registrationData = registrations.find(reg => reg.id === docId);
    
    // Find check-in records that might be linked to this registration
    // We need to check multiple possible userId values since the check-in might have been created
    // with different ID values at different times
    const possibleUserIds = [
      currentId,           // The current/old ID
      docId,              // The document ID
      newId               // The new ID (in case some records already use it)
    ];
    
    // Also check if the registration data has other potential IDs
    if (registrationData?.formData?.id && !possibleUserIds.includes(registrationData.formData.id)) {
      possibleUserIds.push(registrationData.formData.id);
    }
    
    console.log('🔍 Searching for check-ins with userIds:', possibleUserIds);
    
    const updates = [];
    
    // Search for check-ins with each possible userId
    for (const userId of possibleUserIds) {
      if (!userId) continue; // Skip empty values
      
      try {
        const checkinsQuery = query(
          collection(db, "checkins"),
          where("userId", "==", userId)
        );
        
        const snapshot = await getDocs(checkinsQuery);
        console.log(`🔍 Found ${snapshot.docs.length} check-ins with userId: ${userId}`);
        
        snapshot.docs.forEach(d => {
          const updateData = { 
            userId: newId // Always update to the new ID
          };
          
          // If we have the full registration data, sync key fields to formData
          if (registrationData && registrationData.formData) {
            // Merge with existing formData instead of replacing it
            updateData.formData = {
              ...d.data().formData, // Preserve existing formData
              id: newId,
              firstName: registrationData.formData.firstName,
              lastName: registrationData.formData.lastName,
              household: registrationData.formData.household || ''
            };
            
            // Also update the name field for consistency
            updateData.name = `${registrationData.formData.firstName} ${registrationData.formData.lastName}`;
          } else {
            // Fallback: just update the formData.id
            updateData["formData.id"] = newId;
          }
          
          console.log(`🔄 Updating check-in ${d.id} with new data:`, updateData);
          updates.push(updateDoc(doc(db, "checkins", d.id), updateData));
        });
      } catch (error) {
        console.error(`Error searching for check-ins with userId ${userId}:`, error);
      }
    }
    
    // Execute all updates
    if (updates.length > 0) {
      try {
        await Promise.all(updates);
        console.log(`✅ Successfully updated ${updates.length} check-in records`);
      } catch (error) {
        console.error("Error executing check-in updates:", error);
      }
    } else {
      console.log('ℹ️ No check-in records found to update');
    }
    
    setSaveMessage("ID saved successfully!");
    setEditedIds(prev => {
      const updated = { ...prev };
      delete updated[docId];
      return updated;
    });
    await fetchAllRegistrations();
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const saveHousehold = async (regDocId, userId, currentValue) => {
    let newValue;
    const editedData = editedHouseholds[regDocId];
    
    if (editedData && Array.isArray(editedData)) {
      // Filter out empty entries and serialize
      const validEntries = editedData.filter(entry => entry.value && entry.value.trim());
      newValue = JSON.stringify(validEntries);
    } else {
      newValue = editedData !== undefined ? editedData : currentValue || "";
    }

    await updateDoc(doc(db, "registrations", regDocId), {
      "formData.household": newValue
    });

    // Update in all checkins for this user
    const checkinsQuery = query(
      collection(db, "checkins"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(checkinsQuery);
    
    // Get the full registration data to sync to check-ins
    const registrationData = registrations.find(reg => 
      reg.formData?.id === userId || reg.id === userId
    );
    
    const updates = snapshot.docs.map(d => {
      const updateData = { household: newValue };
      
      // If we have the full registration data, sync key fields to formData
      if (registrationData && registrationData.formData) {
        updateData.formData = {
          id: registrationData.formData.id,
          firstName: registrationData.formData.firstName,
          lastName: registrationData.formData.lastName,
          household: newValue
        };
      }
      
      return updateDoc(doc(db, "checkins", d.id), updateData);
    });
    await Promise.all(updates);

    setSaveMessage("Picking up for saved successfully!");
    setEditedHouseholds(prev => {
      const updated = { ...prev };
      delete updated[regDocId];
      return updated;
    });
    await fetchAllRegistrations();
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const saveTefap = async (regDocId) => {
    const tefapData = editedTefap[regDocId];
    if (!tefapData) return;

    await updateDoc(doc(db, "registrations", regDocId), {
      "formData.tefapDate": tefapData.date || ""
    });

    setSaveMessage("TEFAP data saved successfully!");
    setEditedTefap(prev => {
      const updated = { ...prev };
      delete updated[regDocId];
      return updated;
    });
    await fetchAllRegistrations();
    setTimeout(() => setSaveMessage(""), 3000);
  };
  const deleteRegistration = async (regId, regName) => {
    const confirmMessage = `Are you sure you want to permanently delete the registration for "${regName}"?\n\nThis action cannot be undone and will remove the registration from the database completely.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteDoc(doc(db, "registrations", regId));
        setSaveMessage("Registration deleted successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      } catch (error) {
        console.error("Error deleting registration:", error);
        setSaveMessage("Error deleting registration. Please try again.");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    }
  };

  const viewRegistrationForm = (registration) => {
    setSelectedRegistration(registration);
    setShowFormModal(true);
    initializeAdminFields(registration.id, registration);
    initializeFormFields(registration.id, registration.formData || {});
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setSelectedRegistration(null);
  };

  const downloadFormAsImage = async () => {
    try {
      // Dynamic import to avoid bundling issues
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.getElementById('form-modal-content');
      if (element) {
        // Show a loading state
        const downloadBtn = document.querySelector('.download-button');
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = 'Generating...';
        downloadBtn.disabled = true;

        // More robust way to find and hide admin buttons
        const allButtons = element.querySelectorAll('button');
        const buttonsToHide = [];
        allButtons.forEach(btn => {
          const text = btn.textContent.trim();
          if (text === 'Re-sign' || text === 'Clear' || text === 'Use My Saved Signature' || text === 'Save Admin Fields') {
            buttonsToHide.push({
              element: btn,
              originalDisplay: btn.style.display
            });
            btn.style.display = 'none';
          }
        });

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: element.scrollWidth,
          height: element.scrollHeight
        });
        
        // Restore admin controls visibility
        buttonsToHide.forEach(({ element, originalDisplay }) => {
          element.style.display = originalDisplay;
        });
        
        const link = document.createElement('a');
        const firstName = selectedRegistration.formData?.firstName || 'unknown';
        const lastName = selectedRegistration.formData?.lastName || 'unknown';
        const registrationId = selectedRegistration.formData?.id || 'unknown-id';
        const submittedDate = selectedRegistration.submittedAt && typeof selectedRegistration.submittedAt.toDate === "function"
          ? selectedRegistration.submittedAt.toDate().toISOString().slice(0, 10)
          : 'unknown-date';
        
        link.download = `TEFAP-Registration-${registrationId}-${firstName}-${lastName}-${submittedDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Reset button state
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error generating image. Please try again.');
      
      // Reset button state
      const downloadBtn = document.querySelector('.download-button');
      if (downloadBtn) {
        downloadBtn.textContent = 'Download as Image';
        downloadBtn.disabled = false;
      }
    }
  };

  // --- EXPORT LOGIC STARTS HERE ---
  function getRegistrationsInDateRange() {
    if (!startDate && !endDate) return registrations;
    return registrations.filter(reg => {
      if (!reg.submittedAt) return false;
      const regDate = reg.submittedAt.toDate ? reg.submittedAt.toDate() : new Date(reg.submittedAt);
      const afterStart = startDate ? regDate >= new Date(startDate) : true;
      const beforeEnd = endDate ? regDate <= new Date(endDate + "T23:59:59") : true;
      return afterStart && beforeEnd;
    });
  }

  function flattenAndStringify(obj) {
    const result = {};
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        result[key] = JSON.stringify(obj[key]);
      } else {
        result[key] = obj[key] ?? "";
      }
    }
    return result;
  }

  const exportRegistrations = () => {
    const filtered = getRegistrationsInDateRange();

    // Define the desired column order
    const desiredKeys = [
      "firstName",
      "lastName",
      "id",
      "household",
      "dateOfBirth",
      "phone",
      "address",
      "apartment",
      "city",
      "state",
      "zipCode",
      "race",
      "ethnicity",
      "sex",
      "maritalStatus",
      "nameOfProxy",
      "children",
      "adults",
      "seniors",
      "language",
      "countryOfBirth",
      "incomeYear",
      "incomeMonth",
      "incomeWeek",
      "snap",
      "tanf",
      "ssi",
      "nsls",
      "medicaid",
      "crisisReason",
      "agreedToCert",
      "lastCheckIn",
      "submittedAt",
      "site",
      // Admin fields
      "adminIsEligible",
      "adminIsIneligible",
      "adminEligibleBeginMonth",
      "adminEligibleBeginYear", 
      "adminEligibleEndMonth",
      "adminEligibleEndYear",
      "adminIneligibleBeginMonth",
      "adminIneligibleBeginYear",
      "adminIneligibleEndMonth", 
      "adminIneligibleEndYear",
      "adminStaffSignature",
      "adminStaffDate",
      "tefapDate",
      
      // ... add all other keys in your desired order ...
    ];

    const allKeys = desiredKeys;

    // Build the data array with all fields, flattening and stringifying as needed
    const data = filtered.map(reg => {
      const flat = flattenAndStringify(reg.formData || {});
      flat.submittedAt = reg.submittedAt && typeof reg.submittedAt.toDate === "function"
        ? reg.submittedAt.toDate().toLocaleString()
        : "";
      // Use the actual registration ID from formData instead of the Firebase document ID
      flat.id = reg.formData?.id || reg.id || "";
      
      // Add admin fields
      const adminData = reg.adminData || {};
      flat.adminIsEligible = adminData.isEligible ? "Yes" : "No";
      flat.adminIsIneligible = adminData.isIneligible ? "Yes" : "No";
      flat.adminEligibleBeginMonth = adminData.eligibleBeginMonth || "";
      flat.adminEligibleBeginYear = adminData.eligibleBeginYear || "";
      flat.adminEligibleEndMonth = adminData.eligibleEndMonth || "";
      flat.adminEligibleEndYear = adminData.eligibleEndYear || "";
      flat.adminIneligibleBeginMonth = adminData.ineligibleBeginMonth || "";
      flat.adminIneligibleBeginYear = adminData.ineligibleBeginYear || "";
      flat.adminIneligibleEndMonth = adminData.ineligibleEndMonth || "";
      flat.adminIneligibleEndYear = adminData.ineligibleEndYear || "";
      flat.adminStaffSignature = adminData.staffSignature || "";
      flat.adminStaffDate = adminData.staffDate || "";
      
      // TEFAP fields
      flat.tefapDate = flat.tefapDate || "";
      
      // Site field (maps from location field in database)
      flat.site = flat.location || "";
      
      allKeys.forEach(key => {
        if (!(key in flat)) flat[key] = "";
      });
      return flat;
    });

    // CSV Export only
    const headers = allKeys.join(",");
    const rows = data.map(row => allKeys.map(key => `"${row[key]}"`).join(","));
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  // --- EXPORT LOGIC ENDS HERE ---

  // Early return after all hooks to comply with Rules of Hooks
  if (loading) return <div style={{textAlign: 'center', padding: '2rem', fontSize: '18px'}}>⏳ Loading admin data...</div>;

  // When Show Live Queue toggle is active, render the exact AdminViewer live operations UI
  if (showArchived) {
    return (
      <div className="admin-viewer-container" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <label>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={() => setShowArchived(false)}
              style={{ marginRight: '0.5rem' }}
            />
            Show Live Queue
          </label>
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back to Database View
          </button>
        </div>

        <AdminViewer />
      </div>
    );
  }

  // Form field editing functions
  const handleFormFieldChange = (regId, field, value) => {
    setEditedFormFields(prev => ({
      ...prev,
      [regId]: {
        ...prev[regId],
        [field]: value
      }
    }));
  };

  const initializeFormFields = (regId, formData) => {
    if (!editedFormFields[regId]) {
      setEditedFormFields(prev => ({
        ...prev,
        [regId]: { ...formData }
      }));
    }
  };

  const saveFormFields = async (regId) => {
    const fieldsToSave = editedFormFields[regId];
    if (!fieldsToSave) return;

    try {
      const updateData = {};
      Object.keys(fieldsToSave).forEach(key => {
        updateData[`formData.${key}`] = fieldsToSave[key];
      });

      await updateDoc(doc(db, "registrations", regId), updateData);
      
      // Update the local state to reflect the saved changes
      setRegistrations(prev => prev.map(reg => 
        reg.id === regId 
          ? { ...reg, formData: { ...reg.formData, ...fieldsToSave } }
          : reg
      ));
      
      setSaveMessage("Form fields saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving form fields:", error);
      setSaveMessage("Error saving form fields!");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  return (
    <div className="admin-viewer-container" style={{ position: 'relative' }}>
      
      {/* Top bar: Controls in horizontal layout */}
      <div style={{ marginBottom: "2rem" }}>
        {/* Controls section */}
        <div style={{ marginBottom: "1.5rem" }}>
          {/* Archive toggle */}
          <div style={{ marginBottom: "1rem" }}>
            <label>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
                style={{ marginRight: "0.5rem" }}
              />
              Show Live Queue
            </label>
          </div>
          {/* Filters only when served is checked */}
          {showArchived && (
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder="First Name"
                value={firstNameFilter}
                onChange={e => setFirstNameFilter(e.target.value)}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastNameFilter}
                onChange={e => setLastNameFilter(e.target.value)}
              />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          )}
          
          {/* Search and Sort Controls for Registrations */}
          {!showArchived && (
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontWeight: "bold", minWidth: "60px" }}>Search:</label>
                <input
                  type="text"
                  placeholder="Search by name, ID, phone, address, or DOB..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Search happens automatically due to searchTerm change
                    }
                  }}
                  style={{ minWidth: "300px", padding: "6px 12px" }}
                />
                <button
                  onClick={() => {
                    // The search happens automatically due to searchTerm state
                    // This button is mainly for visual feedback
                  }}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    minWidth: "70px"
                  }}
                  title="Search (or just start typing)"
                >
                  🔍 Search
                </button>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                    title="Clear search"
                  >
                    Clear Search
                  </button>
                )}
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontWeight: "bold", minWidth: "50px" }}>Sort by:</label>
                <select
                  value={sortField}
                  onChange={e => setSortField(e.target.value)}
                  style={{ padding: "6px 12px" }}
                >
                  <option value="submittedAt">Submission Date</option>
                  <option value="name">Name</option>
                  <option value="id">ID</option>
                </select>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontWeight: "bold" }}>Order:</label>
                <select
                  value={sortDirection}
                  onChange={e => setSortDirection(e.target.value)}
                  style={{ padding: "6px 12px" }}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
              
              {(searchTerm || sortField !== 'submittedAt' || sortDirection !== 'desc') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSortField('submittedAt');
                    setSortDirection('desc');
                  }}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

          {/* Dedicated Search Results Section */}
          {searchTerm && !showArchived && (
            <div style={{
              backgroundColor: "#f8f9fa",
              border: "2px solid #2196F3",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "2rem"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                borderBottom: "2px solid #2196F3",
                paddingBottom: "0.5rem"
              }}>
                <h3 style={{
                  margin: 0,
                  color: "#2196F3",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap"
                }}>
                  {`Search Results for "${searchTerm}"`}
                </h3>
                <div style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#2196F3"
                }}>
                  {filteredRegistrations.length} result{filteredRegistrations.length !== 1 ? 's' : ''} found
                </div>
              </div>

              {filteredRegistrations.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#666"
                }}>
                  <p style={{ fontSize: "18px", marginBottom: "1rem" }}>
                    No registrations found matching "{searchTerm}"
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "16px"
                    }}
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div style={{
                  maxHeight: "600px",
                  overflowY: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    backgroundColor: "white"
                  }}>
                    <thead style={{
                      backgroundColor: "#2196F3",
                      color: "white",
                      position: "sticky",
                      top: 0
                    }}>
                      <tr>
                        <th style={{ padding: "12px", textAlign: "left", borderRight: "1px solid #1976d2" }}>Name</th>
                        <th style={{ padding: "12px", textAlign: "left", borderRight: "1px solid #1976d2" }}>ID</th>
                        <th style={{ padding: "12px", textAlign: "left", borderRight: "1px solid #1976d2" }}>Phone</th>
                        <th style={{ padding: "12px", textAlign: "left", borderRight: "1px solid #1976d2" }}>Address</th>
                        <th style={{ padding: "12px", textAlign: "left", borderRight: "1px solid #1976d2" }}>Date of Birth</th>
                        <th style={{ padding: "12px", textAlign: "left", borderRight: "1px solid #1976d2" }}>Site</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((reg, index) => (
                        <tr key={reg.id} style={{
                          backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                          borderBottom: "1px solid #eee"
                        }}>
                          <td style={{ padding: "12px", borderRight: "1px solid #eee" }}>
                            <strong>{reg.formData?.firstName} {reg.formData?.lastName}</strong>
                          </td>
                          <td style={{ padding: "12px", borderRight: "1px solid #eee" }}>
                            {reg.formData?.id || reg.id}
                          </td>
                          <td style={{ padding: "12px", borderRight: "1px solid #eee" }}>
                            {reg.formData?.phone}
                          </td>
                          <td style={{ padding: "12px", borderRight: "1px solid #eee" }}>
                            {reg.formData?.address}, {reg.formData?.city}
                          </td>
                          <td style={{ padding: "12px", borderRight: "1px solid #eee" }}>
                            {reg.formData?.dateOfBirth}
                          </td>
                          <td style={{ padding: "12px", borderRight: "1px solid #eee" }}>
                            <select
                              value={editedLocations[reg.id] !== undefined ? editedLocations[reg.id] : (reg.formData?.location || '')}
                              onChange={(e) => handleLocationChange(reg.id, e.target.value)}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #ccc",
                                borderRadius: "3px",
                                fontSize: "12px",
                                backgroundColor: "white"
                              }}
                            >
                              <option value="">Select Location</option>
                              <option value="Plano">Plano</option>
                              <option value="Dallas">Dallas</option>
                              <option value="Both">Both</option>
                            </select>
                            <button
                              onClick={() => saveLocation(reg.id, reg.formData?.id || reg.id, reg.formData?.location)}
                              style={{
                                marginLeft: "4px",
                                padding: "2px 6px",
                                backgroundColor: "#2196F3",
                                color: "white",
                                border: "none",
                                borderRadius: "2px",
                                cursor: "pointer",
                                fontSize: "10px"
                              }}
                            >
                              Save
                            </button>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button
                                onClick={() => {
                                  setSelectedRegistration(reg);
                                  setShowFormModal(true);
                                }}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: "#4CAF50",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  // Copy ID to search to filter main table
                                  setSearchTerm(reg.formData?.id || reg.id);
                                }}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: "#2196F3",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              >
                                Open in Main Table
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Pagination Controls - Show if we have data */}
              {(displayData.length > 0 || registrations.length > 0) && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  margin: '20px 0',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ddd'
                }}>
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1 || loading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: (currentPage === 1 || loading) ? '#ccc' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Loading...' : 'Previous'}
                  </button>
                  
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {loading ? 'Loading...' : 
                     totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : `Page ${currentPage}`}
                  </span>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={loading || currentPage >= totalPages}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: (loading || currentPage >= totalPages) ? '#ccc' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (loading || currentPage >= totalPages) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Loading...' : 'Next'}
                  </button>
                  
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginLeft: 0,
                    marginTop: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <label style={{ fontWeight: "bold", fontSize: "14px" }}>Show:</label>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{ padding: "6px 10px", fontSize: "14px", minWidth: '90px' }}
                    >
                      <option value={20}>20</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={60}>60</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                  
                  <span style={{
                    fontSize: '14px',
                    color: '#666',
                    marginLeft: 0,
                    marginTop: '10px',
                    width: '100%',
                    textAlign: 'center',
                    wordBreak: 'break-word'
                  }}>
                    Showing {startIndex + 1}-{Math.min(endIndex, displayData.length)} of {displayData.length} records (Page {currentPage} of {totalPages}) ({pageSize} per page)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Dynamic heading based on search/filter state */}
          {!showArchived && searchTerm ? (
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <h2 className="admin-heading" style={{ 
                color: "#2196F3", 
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem"
              }}>
                🔍 Search Results for "{searchTerm}"
              </h2>
              <div style={{ 
                fontSize: "16px", 
                color: "#666",
                fontStyle: "italic"
              }}>
                in Registration Database
              </div>
            </div>
          ) : (
            <>
              {showArchived ? (
                <h2 className="admin-heading" style={{ textAlign: "center" }}>Live Registration</h2>
              ) : (
                <h2 className="admin-heading" style={{ textAlign: "center" }}>Registration Database</h2>
              )}
            </>
          )}

          {/* Conditionally render the export button */}
          {!showArchived && (
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <button onClick={exportRegistrations}>Export Registrations (CSV)</button>
            </div>
          )}

          {/* Enhanced Results count with search context */}
          {!showArchived && (
            <div style={{ 
              marginBottom: "1rem", 
              padding: searchTerm ? "12px 16px" : "8px 12px", 
              backgroundColor: searchTerm ? "#e3f2fd" : "#f5f5f5", 
              borderRadius: "4px",
              fontSize: searchTerm ? "16px" : "14px",
              color: searchTerm ? "#1976d2" : "#666",
              border: searchTerm ? "2px solid #2196F3" : "none",
              fontWeight: searchTerm ? "bold" : "normal"
            }}>
              {searchTerm ? (
                <div>
                  <div style={{ marginBottom: "4px" }}>
                    📊 Found {filteredRegistrations.length} registration{filteredRegistrations.length !== 1 ? 's' : ''} matching your search
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "normal", color: "#666" }}>
                    Search terms: "{searchTerm}"
                    {sortField !== 'submittedAt' && ` • Sorted by ${sortField} (${sortDirection}ending)`}
                    {(firstNameFilter || lastNameFilter || startDate || endDate) && " • Additional filters applied"}
                  </div>
                </div>
              ) : (
                <div>
                  Showing {filteredRegistrations.length} registration{filteredRegistrations.length !== 1 ? 's' : ''}
                  {sortField !== 'submittedAt' && ` sorted by ${sortField} (${sortDirection}ending)`}
                  {(firstNameFilter || lastNameFilter || startDate || endDate) && " (filtered)"}
                </div>
              )}
            </div>
          )}

          {/* No results message */}
          {searchTerm && filteredRegistrations.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "2rem",
              backgroundColor: "#fff3cd",
              border: "2px solid #ffc107",
              borderRadius: "8px",
              marginBottom: "1rem"
            }}>
              <h3 style={{ color: "#856404", marginBottom: "1rem" }}>No Results Found</h3>
              <p style={{ color: "#856404", marginBottom: "1rem" }}>
                No registrations found matching your search for "<strong>{searchTerm}</strong>".
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ffc107",
                    color: "#212529",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  Clear Search
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFirstNameFilter('');
                    setLastNameFilter('');
                    setStartDate('');
                    setEndDate('');
                    setSortField('submittedAt');
                    setSortDirection('desc');
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              textAlign: "center",
              padding: "3rem",
              fontSize: "18px",
              color: "#666"
            }}>
              Loading historical data...
            </div>
          )}

          {/* Empty State */}
          {!loading && displayData.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "3rem",
              backgroundColor: "#f8f9fa",
              border: "2px dashed #ccc",
              borderRadius: "8px",
              color: "#666"
            }}>
              <h3>No Records Found</h3>
              <p>
                {showArchived 
                  ? "No archived registrations found." 
                  : "No active registrations found."}
              </p>
              <p>Try switching to {showArchived ? "Active" : "Archived"} records or adjusting your filters.</p>
            </div>
          )}

          {/* Data Table */}
          {!loading && displayData.length > 0 && !showArchived && (
            <>
            {/* PAGINATION CONTROLS - TOP */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              margin: '20px 0',
              padding: '10px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}>
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1 || loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: (currentPage === 1 || loading) ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Loading...' : 'Previous'}
              </button>
              
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {loading ? 'Loading...' : 
                 totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : `Page ${currentPage}`}
              </span>
              
              <button
                onClick={goToNextPage}
                disabled={loading || currentPage >= totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: (loading || currentPage >= totalPages) ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (loading || currentPage >= totalPages) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Loading...' : 'Next'}
              </button>
              
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                marginLeft: 0,
                marginTop: '10px',
                flexWrap: 'wrap'
              }}>
                <label style={{ fontWeight: "bold", fontSize: "14px" }}>Show:</label>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  style={{ padding: "6px 10px", fontSize: "14px", minWidth: '90px' }}
                >
                  <option value={20}>20</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                  <option value={60}>60</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              
              <span style={{
                fontSize: '14px',
                color: '#666',
                marginLeft: 0,
                marginTop: '10px',
                width: '100%',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}>
                Showing {startIndex + 1}-{Math.min(endIndex, displayData.length)} of {displayData.length} records ({pageSize} per page)
              </span>
            </div>
            
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '12px',
                margin: '12px 0 16px',
                padding: '12px 16px',
                backgroundColor: '#f8f9ff',
                border: '1px solid #cfd8dc',
                borderRadius: '6px'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0d47a1' }}>
                Batch edit (selected: {selectedCount})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>TEFAP date:</label>
                <input
                  type="date"
                  value={batchTefapDate}
                  onChange={(e) => setBatchTefapDate(e.target.value)}
                  style={{
                    fontSize: '12px',
                    padding: '4px 6px',
                    border: '1px solid #b0bec5',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Site:</label>
                <select
                  value={batchLocation}
                  onChange={(e) => setBatchLocation(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #b0bec5',
                    borderRadius: '4px',
                    fontSize: '12px',
                    minWidth: '90px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select</option>
                  <option value="Plano">Plano</option>
                  <option value="Dallas">Dallas</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <button
                onClick={applyBatchUpdates}
                disabled={isBatchApplyDisabled}
                style={{
                  padding: '6px 14px',
                  backgroundColor: isBatchApplyDisabled ? '#b0bec5' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isBatchApplyDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {isApplyingBatch ? 'Applying...' : 'Apply to selected'}
              </button>
              <button
                onClick={handleBatchFieldReset}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#eceff1',
                  color: '#37474f',
                  border: '1px solid #cfd8dc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Reset fields
              </button>
              <button
                onClick={clearBatchSelection}
                disabled={selectedCount === 0}
                style={{
                  padding: '6px 10px',
                  backgroundColor: selectedCount === 0 ? '#eceff1' : '#fbe9e7',
                  color: selectedCount === 0 ? '#90a4ae' : '#d84315',
                  border: '1px solid #ffccbc',
                  borderRadius: '4px',
                  cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                Clear selection
              </button>
            </div>
            
            <table className="admin-table">
            <thead>
              <tr>
                <th className="selection-column" style={{ width: '45px', textAlign: 'center' }}>
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={(e) => handleSelectAllCurrentPage(e.target.checked)}
                  />
                </th>
                <th 
                  onClick={() => {
                    if (sortField === 'name') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('name');
                      setSortDirection('asc');
                    }
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by name"
                >
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => {
                    if (sortField === 'id') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('id');
                      setSortDirection('asc');
                    }
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by ID"
                >
                  ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => {
                    if (sortField === 'dateOfBirth') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('dateOfBirth');
                      setSortDirection('asc');
                    }
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by date of birth"
                >
                  Date of Birth {sortField === 'dateOfBirth' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => {
                    if (sortField === 'phone') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('phone');
                      setSortDirection('asc');
                    }
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by phone"
                >
                  Phone {sortField === 'phone' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => {
                    if (sortField === 'address') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('address');
                      setSortDirection('asc');
                    }
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by address"
                >
                  Address {sortField === 'address' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>APT #</th>
                <th>Picking up for</th>
                <th>{t('tefap')}</th>
                <th>Site</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(reg => (
                <tr 
                  key={reg.id}
                  style={selectedRegistrations[reg.id] ? { backgroundColor: '#f1f8ff' } : undefined}
                >
                  <td className="selection-cell" data-label="Select" style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedRegistrations[reg.id]}
                      onChange={() => toggleSelectRegistration(reg.id)}
                    />
                  </td>
                  <td className="name-cell" data-label="Name">
                    <span className="name-primary">
                      {reg.formData?.firstName} {reg.formData?.lastName}
                    </span>
                  </td>
                  <td data-label="ID">
                    <input
                      value={editedIds[reg.id] !== undefined ? editedIds[reg.id] : reg.formData?.id || ""}
                      onChange={e => handleIdChange(reg.id, e.target.value)}
                      style={{ width: "100px" }}
                    />
                  </td>
                  <td data-label="Date of Birth">{reg.formData?.dateOfBirth}</td>
                  <td data-label="Phone">{reg.formData?.phone}</td>
                  <td data-label="Address">{reg.formData?.address}</td>
                  <td data-label="APT #">{reg.formData?.apartment || ''}</td>
                  <td data-label="Picking up for">
                    <div style={{ position: 'relative' }}>
                      {!householdEditorOpen[reg.id] ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input
                            value={(() => {
                              const edited = editedHouseholds[reg.id];
                              if (Array.isArray(edited)) {
                                const validEntries = edited.filter(e => e.value && e.value.trim());
                                return validEntries.length > 0 
                                  ? `${validEntries.length} entries` 
                                  : '';
                              }
                              return edited !== undefined ? edited : reg.formData?.household || "";
                            })()}
                            onChange={e => handleHouseholdChange(reg.id, e.target.value)}
                            style={{ width: "80px", fontSize: "12px" }}
                            placeholder="Click +"
                            readOnly={Array.isArray(editedHouseholds[reg.id])}
                          />
                          <button 
                            onClick={() => {
                              initializeHouseholdData(reg.id, reg.formData?.household);
                              toggleHouseholdEditor(reg.id);
                            }}
                            style={{ 
                              padding: '2px 6px', 
                              fontSize: '12px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <>
                          <div 
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0,0,0,0.3)',
                              zIndex: 9998
                            }}
                            onClick={() => toggleHouseholdEditor(reg.id)}
                          />
                          <div style={{ 
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 9999,
                            backgroundColor: 'white',
                            border: '2px solid #ccc',
                            borderRadius: '5px',
                            padding: '15px',
                            minWidth: '400px',
                            maxWidth: '500px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            maxHeight: '80vh',
                            overflowY: 'auto'
                          }}>
                          <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                            Picking up for:
                          </div>
                          {[...Array(6)].map((_, index) => {
                            const entry = editedHouseholds[reg.id]?.[index] || { type: '', value: '' };
                            const searchKey = `${reg.id}-${index}`;
                            const currentResults = searchResults[searchKey] || [];
                            
                            return (
                              <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <select
                                  value={entry.type}
                                  onChange={(e) => updateHouseholdEntry(reg.id, index, 'type', e.target.value)}
                                  style={{ width: '80px', fontSize: '12px' }}
                                >
                                  <option value="">Select</option>
                                  <option value="registration">Reg ID</option>
                                  <option value="other">Other</option>
                                </select>
                                <div style={{ position: 'relative', flex: 1 }}>
                                  <input
                                    type="text"
                                    value={entry.value}
                                    onChange={(e) => {
                                      updateHouseholdEntry(reg.id, index, 'value', e.target.value);
                                      if (entry.type === 'registration') {
                                        handleRegistrationSearch(reg.id, index, e.target.value);
                                      }
                                    }}
                                    placeholder={entry.type === 'registration' ? 'Enter Reg ID' : 'Enter name/description'}
                                    style={{ width: '100%', fontSize: '12px' }}
                                  />
                                  {entry.type === 'registration' && currentResults.length > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: 0,
                                      right: 0,
                                      backgroundColor: 'white',
                                      border: '1px solid #ccc',
                                      borderRadius: '3px',
                                      maxHeight: '120px',
                                      overflowY: 'auto',
                                      zIndex: 1001
                                    }}>
                                      {currentResults.map((result, resultIndex) => (
                                        <div
                                          key={resultIndex}
                                          onClick={() => {
                                            updateHouseholdEntry(reg.id, index, 'value', result.registrationId);
                                            setSearchResults(prev => ({ ...prev, [searchKey]: [] }));
                                          }}
                                          style={{
                                            padding: '5px',
                                            cursor: 'pointer',
                                            borderBottom: resultIndex < currentResults.length - 1 ? '1px solid #eee' : 'none',
                                            fontSize: '12px',
                                            backgroundColor: 'white'
                                          }}
                                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                        >
                                          <div><strong>{result.registrationId}</strong></div>
                                          <div style={{ color: '#666' }}>{result.name}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {entry.value && (
                                  <button
                                    onClick={() => updateHouseholdEntry(reg.id, index, 'value', '')}
                                    style={{
                                      padding: '2px 5px',
                                      fontSize: '10px',
                                      backgroundColor: '#f44336',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '2px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => toggleHouseholdEditor(reg.id)}
                              style={{
                                padding: '5px 10px',
                                fontSize: '12px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Done
                            </button>
                            <button
                              onClick={() => {
                                setEditedHouseholds(prev => ({ ...prev, [reg.id]: undefined }));
                                toggleHouseholdEditor(reg.id);
                              }}
                              style={{
                                padding: '5px 10px',
                                fontSize: '12px',
                                backgroundColor: '#757575',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td data-label="TEFAP">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '120px' }}>
                      <input
                        type="date"
                        value={editedTefap[reg.id]?.date || reg.formData?.tefapDate || ''}
                        onChange={e => handleTefapChange(reg.id, 'date', e.target.value)}
                        style={{ 
                          fontSize: '12px', 
                          width: '100%', 
                          backgroundColor: '#fffacd',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          padding: '4px'
                        }}
                        placeholder="Date"
                      />
                    </div>
                  </td>
                  <td data-label="Site">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <select
                        value={editedLocations[reg.id] !== undefined ? editedLocations[reg.id] : (reg.formData?.location || '')}
                        onChange={(e) => handleLocationChange(reg.id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          border: "1px solid #ccc",
                          borderRadius: "3px",
                          fontSize: "12px",
                          backgroundColor: "white",
                          width: "90px"
                        }}
                      >
                        <option value="">Select</option>
                        <option value="Plano">Plano</option>
                        <option value="Dallas">Dallas</option>
                        <option value="Both">Both</option>
                      </select>
                      <button
                        onClick={() => saveLocation(reg.id, reg.formData?.id || reg.id, reg.formData?.location)}
                        style={{
                          padding: "2px 6px",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "2px",
                          cursor: "pointer",
                          fontSize: "10px"
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td data-label="Actions">
                    <div className="action-buttons">
                      <button onClick={() => viewRegistrationForm(reg)}>View Form</button>
                      <button onClick={() => saveId(reg.id, reg.formData?.id)}>Save ID</button>
                      <button onClick={() => saveHousehold(reg.id, reg.formData?.id, editedHouseholds[reg.id] ?? reg.formData?.household)}>
                        Save Picking up for
                      </button>
                      <button onClick={() => saveTefap(reg.id)}>Save TEFAP</button>
                      <button 
                        onClick={() => deleteRegistration(reg.id, `${reg.formData?.firstName} ${reg.formData?.lastName}`)}
                        className="delete-button"
                        style={{ backgroundColor: '#f44336', color: 'white' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            margin: '20px 0',
            padding: '10px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}>
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1 || loading}
              style={{
                padding: '8px 16px',
                backgroundColor: (currentPage === 1 || loading) ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (currentPage === 1 || loading) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Loading...' : 'Previous'}
            </button>
            
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {loading ? 'Loading...' : 
               totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : `Page ${currentPage}`}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={loading || currentPage >= totalPages}
              style={{
                padding: '8px 16px',
                backgroundColor: (loading || currentPage >= totalPages) ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (loading || currentPage >= totalPages) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Loading...' : 'Next'}
            </button>
            
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginLeft: 0,
              marginTop: '10px',
              flexWrap: 'wrap'
            }}>
              <label style={{ fontWeight: "bold", fontSize: "14px" }}>Show:</label>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                style={{ padding: "6px 10px", fontSize: "14px", minWidth: '90px' }}
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
                <option value={60}>60</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            
            <span style={{
              fontSize: '14px',
              color: '#666',
              marginLeft: 0,
              marginTop: '10px',
              width: '100%',
              textAlign: 'center',
              wordBreak: 'break-word'
            }}>
              Showing {startIndex + 1}-{Math.min(endIndex, displayData.length)} of {displayData.length} records ({pageSize} per page)
            </span>
          </div>
          
          </>
          )}
          
          {saveMessage && (
            <div className="save-message-overlay" onClick={() => setSaveMessage("")}>
              <div className="save-message" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="save-message-close" 
                  onClick={() => setSaveMessage("")}
                  aria-label="Close message"
                >
                  ×
                </button>
                {saveMessage}
                <div className="save-message-hint">Click anywhere to dismiss</div>
              </div>
            </div>
          )}

      {/* Registration Form Modal */}
      {showFormModal && selectedRegistration && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-content form-style-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registration Form Details</h2>
              <div className="modal-actions">
                <button className="download-button" onClick={downloadFormAsImage}>Download as Image</button>
                <button className="close-button" onClick={closeFormModal}>×</button>
              </div>
            </div>
            <div className="modal-body" id="form-modal-content">
              <div className="form-container-modal">
                <div className="form-header">
                  <img src={logo} alt="Logo" />
                  <h2>Register for Food Services</h2>
                </div>
                <div className="submission-info">
                  Submitted: {selectedRegistration.submittedAt && typeof selectedRegistration.submittedAt.toDate === "function" 
                    ? selectedRegistration.submittedAt.toDate().toLocaleString() 
                    : 'N/A'} | ID: {selectedRegistration.formData?.id || selectedRegistration.id}
                </div>

                <div className="form-section">
                  <h3>{t('personalInfo')}</h3>
                  <div className="form-grid">
                    <label>{t('firstName')}
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.firstName || selectedRegistration.formData?.firstName || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'firstName', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('lastName')}
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.lastName || selectedRegistration.formData?.lastName || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'lastName', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('dob')}
                      <input
                        type="date"
                        value={convertDateForInput(editedFormFields[selectedRegistration.id]?.dateOfBirth || selectedRegistration.formData?.dateOfBirth || '')}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'dateOfBirth', convertDateForStorage(e.target.value))}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('phone')}
                      <input
                        type="tel"
                        value={editedFormFields[selectedRegistration.id]?.phone || selectedRegistration.formData?.phone || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'phone', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('address')}
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.address || selectedRegistration.formData?.address || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'address', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>APT #
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.apartment || selectedRegistration.formData?.apartment || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'apartment', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('city')}
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.city || selectedRegistration.formData?.city || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'city', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('state')}
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.state || selectedRegistration.formData?.state || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'state', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('zip')}
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.zipCode || selectedRegistration.formData?.zipCode || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'zipCode', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>{t('race')}
                      <select
                        value={editedFormFields[selectedRegistration.id]?.race || selectedRegistration.formData?.race || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'race', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      >
                        <option value="">Select Race</option>
                        <option value="Caucasian">Caucasian</option>
                        <option value="Black">Black</option>
                        <option value="Latino">Latino</option>
                        <option value="Asian">Asian</option>
                        <option value="Native">Native</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label>{t('ethnicity')}
                      <select
                        value={editedFormFields[selectedRegistration.id]?.ethnicity || selectedRegistration.formData?.ethnicity || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'ethnicity', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      >
                        <option value="">Select Ethnicity</option>
                        <option value="Hispanic">Hispanic</option>
                        <option value="Non-Hispanic">Non-Hispanic</option>
                      </select>
                    </label>
                    <label>{t('sex')}
                      <select
                        value={editedFormFields[selectedRegistration.id]?.sex || selectedRegistration.formData?.sex || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'sex', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      >
                        <option value="">Select Sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label>{t('maritalStatus')}
                      <select
                        value={editedFormFields[selectedRegistration.id]?.maritalStatus || selectedRegistration.formData?.maritalStatus || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'maritalStatus', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      >
                        <option value="">Select Marital Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </label>
                    <label>{t('nameOfProxy')}
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.nameOfProxy || selectedRegistration.formData?.nameOfProxy || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'nameOfProxy', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Household</h3>
                  <div className="form-grid">
                    <label>Children under 18
                      <input
                        type="number"
                        min="0"
                        value={editedFormFields[selectedRegistration.id]?.children || selectedRegistration.formData?.children || '0'}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'children', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>Adults under 60
                      <input
                        type="number"
                        min="0"
                        value={editedFormFields[selectedRegistration.id]?.adults || selectedRegistration.formData?.adults || '0'}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'adults', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>Seniors over 60
                      <input
                        type="number"
                        min="0"
                        value={editedFormFields[selectedRegistration.id]?.seniors || selectedRegistration.formData?.seniors || '0'}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'seniors', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Language & Country of Birth</h3>
                  <div className="form-grid">
                    <label>Preferred Language
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.language || selectedRegistration.formData?.language || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'language', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                        placeholder="Enter preferred language"
                      />
                    </label>
                    <label>Country of Birth
                      <input
                        type="text"
                        value={editedFormFields[selectedRegistration.id]?.countryOfBirth || selectedRegistration.formData?.countryOfBirth || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'countryOfBirth', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Income</h3>
                  <div className="form-grid">
                    <label>Income per Year
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedFormFields[selectedRegistration.id]?.incomeYear || selectedRegistration.formData?.incomeYear || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'incomeYear', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>Income per Month
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedFormFields[selectedRegistration.id]?.incomeMonth || selectedRegistration.formData?.incomeMonth || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'incomeMonth', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                    <label>Income per Week
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedFormFields[selectedRegistration.id]?.incomeWeek || selectedRegistration.formData?.incomeWeek || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'incomeWeek', e.target.value)}
                        style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Assistance Programs</h3>
                  <div className="checkboxes-with-desc">
                    <label>
                      <input
                        type="checkbox"
                        checked={editedFormFields[selectedRegistration.id]?.snap !== undefined 
                          ? editedFormFields[selectedRegistration.id].snap 
                          : (selectedRegistration.formData?.snap || false)}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'snap', e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      <strong>SNAP</strong> – Supplemental Nutrition Assistance Program
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editedFormFields[selectedRegistration.id]?.tanf !== undefined 
                          ? editedFormFields[selectedRegistration.id].tanf 
                          : (selectedRegistration.formData?.tanf || false)}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'tanf', e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      <strong>TANF</strong> – Temporary Assistance for Needy Families
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editedFormFields[selectedRegistration.id]?.ssi !== undefined 
                          ? editedFormFields[selectedRegistration.id].ssi 
                          : (selectedRegistration.formData?.ssi || false)}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'ssi', e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      <strong>SSI</strong> – Supplemental Security Income
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editedFormFields[selectedRegistration.id]?.nsls !== undefined 
                          ? editedFormFields[selectedRegistration.id].nsls 
                          : (selectedRegistration.formData?.nsls || false)}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'nsls', e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      <strong>NSLP</strong> – National School Lunch Program
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editedFormFields[selectedRegistration.id]?.medicaid !== undefined 
                          ? editedFormFields[selectedRegistration.id].medicaid 
                          : (selectedRegistration.formData?.medicaid || false)}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'medicaid', e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      <strong>Medicaid</strong> – Medicaid Health Coverage
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Household Crisis Eligibility</h3>
                  <div className="form-grid">
                    <label style={{ gridColumn: '1 / -1' }}>If household is eligible for household crisis food needs, document reason for crisis here.
                      <textarea
                        value={editedFormFields[selectedRegistration.id]?.crisisReason || selectedRegistration.formData?.crisisReason || ''}
                        onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'crisisReason', e.target.value)}
                        rows="3"
                        style={{ width: '100%', padding: '4px', marginTop: '4px', resize: 'vertical' }}
                        placeholder="Enter crisis reason if applicable..."
                      />
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Certification</h3>
                  <div className="info-box">
                    <p>1. I certify that I am a member of the household living at the address provided in the personal info section and that, on behalf of the household, I apply for USDA Foods that are distributed through The Emergency Food Assistance Program.</p>
                    <p>2. All information provided to the agency determining my household's eligibility is, to the best of my knowledge and belief, true and correct.</p>
                    <p>3. If applicable, the information provided by the household's proxy is, to the best of my knowledge and belief, true and correct.</p>
                  </div>
                  <label style={{ marginTop: '1rem', display: 'block' }}>
                    <input
                      type="checkbox"
                      checked={editedFormFields[selectedRegistration.id]?.agreedToCert !== undefined 
                        ? editedFormFields[selectedRegistration.id].agreedToCert 
                        : (selectedRegistration.formData?.agreedToCert || false)}
                      onChange={(e) => handleFormFieldChange(selectedRegistration.id, 'agreedToCert', e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Check box to agree
                  </label>
                </div>

                <div className="form-section">
                  <h3>Applicant's Authorization</h3>
                  <div className="info-box">
                    <p>I understand that the information I have provided may be checked. Deliberately giving false information may result in a $250 fine, imprisonment up to three months, or both. I also understand that benefits received based on false information must be repaid.</p>
                    <p>I give my permission for officials to check the information I have provided. I also give permission for future contact when the time comes to determine my continued eligibility.</p>
                  </div>
                </div>

                {selectedRegistration.formData?.signature && (
                  <div className="form-section">
                    <h3>Signature</h3>
                    <div className="signature-container">
                      <img src={selectedRegistration.formData.signature} alt="Client Signature" className="signature-image" />
                    </div>
                  </div>
                )}

                {/* Save Form Fields Button */}
                <div style={{ 
                  textAlign: 'center', 
                  margin: '20px 0',
                  padding: '15px',
                  backgroundColor: '#f0f8ff',
                  border: '2px solid #2196F3',
                  borderRadius: '8px'
                }}>
                  <button
                    onClick={() => saveFormFields(selectedRegistration.id)}
                    style={{
                      backgroundColor: '#2196F3',
                      color: 'white',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    💾 Save All Form Fields
                  </button>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginTop: '8px' 
                  }}>
                    Save all changes made to the form fields above
                  </div>
                </div>

                <div className="form-section admin-section">
                  <h3 style={{ backgroundColor: '#333', color: 'white', padding: '8px', margin: '0 0 15px 0' }}>
                    Eligibility or Ineligibility (Admin Only)
                  </h3>
                  
                  {/* Household is eligible section */}
                  <div style={{ border: '2px solid #333', padding: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <input
                        type="checkbox"
                        checked={adminFields[selectedRegistration.id]?.isEligible || false}
                        onChange={(e) => handleAdminFieldChange(
                          selectedRegistration.id, 
                          'isEligible', 
                          e.target.checked
                        )}
                        style={{ marginRight: '8px' }}
                      />
                      <strong>Household is eligible. Length of certification: Beginning (month/year):</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '25px' }}>
                      <input
                        type="text"
                        placeholder="Month"
                        value={adminFields[selectedRegistration.id]?.eligibleBeginMonth || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'eligibleBeginMonth', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                      <span>/</span>
                      <input
                        type="text"
                        placeholder="Year"
                        value={adminFields[selectedRegistration.id]?.eligibleBeginYear || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'eligibleBeginYear', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '25px', marginTop: '8px' }}>
                      <strong>Ending (month/year):</strong>
                      <input
                        type="text"
                        placeholder="Month"
                        value={adminFields[selectedRegistration.id]?.eligibleEndMonth || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'eligibleEndMonth', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                      <span>/</span>
                      <input
                        type="text"
                        placeholder="Year"
                        value={adminFields[selectedRegistration.id]?.eligibleEndYear || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'eligibleEndYear', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Household is ineligible section */}
                  <div style={{ border: '2px solid #333', padding: '10px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <input
                        type="checkbox"
                        checked={adminFields[selectedRegistration.id]?.isIneligible || false}
                        onChange={(e) => handleAdminFieldChange(
                          selectedRegistration.id, 
                          'isIneligible', 
                          e.target.checked
                        )}
                        style={{ marginRight: '8px' }}
                      />
                      <strong>Household is ineligible based on Sections 2 and 3, but qualifies for TEFAP based on Household Crisis Eligibility (Section 4).</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '25px' }}>
                      <strong>Length of certification: Beginning (month/year):</strong>
                      <input
                        type="text"
                        placeholder="Month"
                        value={adminFields[selectedRegistration.id]?.ineligibleBeginMonth || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'ineligibleBeginMonth', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                      <span>/</span>
                      <input
                        type="text"
                        placeholder="Year"
                        value={adminFields[selectedRegistration.id]?.ineligibleBeginYear || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'ineligibleBeginYear', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '25px', marginTop: '8px' }}>
                      <strong>Ending (month/year):</strong>
                      <input
                        type="text"
                        placeholder="Month"
                        value={adminFields[selectedRegistration.id]?.ineligibleEndMonth || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'ineligibleEndMonth', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                      <span>/</span>
                      <input
                        type="text"
                        placeholder="Year"
                        value={adminFields[selectedRegistration.id]?.ineligibleEndYear || ''}
                        onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'ineligibleEndYear', e.target.value)}
                        style={{ width: '80px', padding: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Staff signature section */}
                  <div style={{ border: '2px solid #333', padding: '10px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ textDecoration: 'underline' }}>Signature and date of CE or site staff</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <label><strong>Signature</strong></label>
                        <div style={{ marginTop: '4px' }}>
                          {adminFields[selectedRegistration.id]?.staffSignature ? (
                            <div>
                              <img 
                                src={adminFields[selectedRegistration.id].staffSignature} 
                                alt="Staff Signature" 
                                style={{ 
                                  maxWidth: '100%', 
                                  height: '60px', 
                                  border: '1px solid #ccc',
                                  backgroundColor: '#f9f9f9'
                                }} 
                              />
                              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                {selectedRegistration.adminData?.staffSignature === adminFields[selectedRegistration.id]?.staffSignature 
                                  ? 'Saved from form' 
                                  : 'Auto-loaded from previous signatures'}
                              </div>
                              <div style={{ marginTop: '5px' }}>
                                <button
                                  type="button"
                                  onClick={() => setShowStaffSignaturePad(selectedRegistration.id)}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    marginRight: '5px'
                                  }}
                                >
                                  Re-sign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdminFieldChange(selectedRegistration.id, 'staffSignature', '')}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Clear
                                </button>
                                {localStorage.getItem(`staffSignature_admin`) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const savedSignature = localStorage.getItem(`staffSignature_admin`);
                                      if (savedSignature) {
                                        handleAdminFieldChange(selectedRegistration.id, 'staffSignature', savedSignature);
                                      }
                                    }}
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: '12px',
                                      backgroundColor: '#FF9800',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '3px',
                                      cursor: 'pointer',
                                      marginLeft: '5px'
                                    }}
                                  >
                                    Use My Saved Signature
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowStaffSignaturePad(selectedRegistration.id)}
                                style={{
                                  padding: '10px 20px',
                                  fontSize: '14px',
                                  backgroundColor: '#4CAF50',
                                  color: 'white',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  width: '100%',
                                  marginBottom: '5px'
                                }}
                              >
                                Click to Sign
                              </button>
                              {localStorage.getItem(`staffSignature_admin`) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const savedSignature = localStorage.getItem(`staffSignature_admin`);
                                    if (savedSignature) {
                                      handleAdminFieldChange(selectedRegistration.id, 'staffSignature', savedSignature);
                                    }
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    backgroundColor: '#FF9800',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    width: '100%'
                                  }}
                                >
                                  Use My Saved Signature
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label><strong>Date</strong></label>
                        <input
                          type="date"
                          value={adminFields[selectedRegistration.id]?.staffDate || ''}
                          onChange={(e) => handleAdminFieldChange(selectedRegistration.id, 'staffDate', e.target.value)}
                          style={{ width: '100%', padding: '4px', marginTop: '4px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <button
                      onClick={() => saveAdminFields(selectedRegistration.id)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Save Admin Fields
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Signature Pad Modal */}
      {showStaffSignaturePad && (
        <div className="modal-overlay" onClick={() => setShowStaffSignaturePad(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Staff Signature</h3>
              <button className="close-button" onClick={() => setShowStaffSignaturePad(null)}>×</button>
            </div>
            <div className="modal-body">
              <StaffSignaturePad 
                registrationId={showStaffSignaturePad}
                onSave={(signatureData) => {
                  handleAdminFieldChange(showStaffSignaturePad, 'staffSignature', signatureData);
                  saveStaffSignatureToCache(signatureData);
                  setShowStaffSignaturePad(null);
                }}
                onCancel={() => setShowStaffSignaturePad(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacing */}
      <div style={{ height: '3rem' }}></div>
    </div>
    </div>
  );
}

export default DatabaseManager;
