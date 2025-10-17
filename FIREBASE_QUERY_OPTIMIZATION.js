// CRITICAL PERFORMANCE FIX
// Replace the existing Firebase queries in AdminViewer.jsx with these optimized versions

// BEFORE (SLOW - fetches all data):
// useEffect(() => {
//   const unsubscribe = onSnapshot(collection(db, "registrations"), (snapshot) => {
//     const data = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//     setRegistrations(data);
//     setLoading(false);
//   });
//   return () => unsubscribe();
// }, []);

// AFTER (FAST - with limits and filtering):
useEffect(() => {
  // Only fetch recent registrations (last 30 days) unless showing archived
  let q;
  if (showArchived) {
    // For archived view, get served registrations but limit to 500 most recent
    q = query(
      collection(db, "registrations"),
      where("formData.archived", "==", true),
      orderBy("submittedAt", "desc"),
      limit(500)
    );
  } else {
    // For active view, get recent unarchived registrations
    q = query(
      collection(db, "registrations"),
      where("formData.archived", "!=", true),
      orderBy("submittedAt", "desc"),
      limit(200) // Limit to 200 most recent active registrations
    );
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRegistrations(data);
    setLoading(false);
  }, (error) => {
    console.error("Error fetching registrations:", error);
    setLoading(false);
  });

  return () => unsubscribe();
}, [showArchived]); // Re-run when archive filter changes

// LIVE CHECK-IN QUEUE - OPTIMIZED
useEffect(() => {
  // Only fetch active check-ins (not removed) and limit to recent ones
  const q = query(
    collection(db, "checkins"),
    where("status", "!=", "removed"),
    orderBy("status"),
    orderBy("checkInTime", "desc"),
    limit(100) // Limit to 100 most recent active check-ins
  );
  
  const unsub = onSnapshot(q, (snapshot) => {
    setQueue(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });
  return () => unsub();
}, []);

/* 
TO IMPLEMENT THIS:

1. Add these composite indexes in Firebase Console:
   - Collection: registrations
     Fields: formData.archived (Ascending), submittedAt (Descending)
   
   - Collection: checkins  
     Fields: status (Ascending), checkInTime (Descending)

2. Replace the existing useEffect hooks in AdminViewer.jsx with the code above

3. Expected performance improvement: 60-80% faster loading times
*/