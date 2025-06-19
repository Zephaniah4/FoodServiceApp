import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const SubmissionsTable = () => {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const querySnapshot = await getDocs(collection(db, 'registrations'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubmissions(data);
    };

    fetchSubmissions();
  }, []);

  return (
    <div>
      <h3>Submitted Forms</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>DOB</th>
            <th>Phone</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(sub => (
            <tr key={sub.id}>
              <td>{sub.formData.firstName} {sub.formData.lastName}</td>
              <td>{sub.formData.dob}</td>
              <td>{sub.formData.phone}</td>
              <td>{new Date(sub.submittedAt.seconds * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubmissionsTable;
