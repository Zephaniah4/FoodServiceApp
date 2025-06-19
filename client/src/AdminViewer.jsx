import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, where, getDocs, Timestamp } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import "./AdminViewer.css";
import "./FormStyles_Green.css";

function AdminViewer() {
  const [registrations, setRegistrations] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedIds, setEditedIds] = useState({});
  const [editedHouseholds, setEditedHouseholds] = useState({});
  const [editedQueueHouseholds, setEditedQueueHouseholds] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("both");
  const [showArchived, setShowArchived] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [counterDate, setCounterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [regCount, setRegCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoginError("");
    } catch (error) {
      setLoginError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Real-time listener for registrations
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "registrations"), (snapshot) => {
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
  }, []);

  // Live check-in queue listener
  useEffect(() => {
    const q = query(collection(db, "checkins"), orderBy("checkInTime"));
    const unsub = onSnapshot(q, (snapshot) => {
      setQueue(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Actions for queue
  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "checkins", id), { status });
  };

  const removeCheckin = async (id) => {
    await updateDoc(doc(db, "checkins", id), { status: "removed" });
  };

  const handleIdChange = (docId, newId) => {
    setEditedIds(prev => ({ ...prev, [docId]: newId }));
  };

  const handleHouseholdChange = (docId, value) => {
    setEditedHouseholds(prev => ({ ...prev, [docId]: value }));
  };

  const handleQueueHouseholdChange = (docId, value) => {
    setEditedQueueHouseholds(prev => ({ ...prev, [docId]: value }));
  };

  const saveId = async (docId, currentId) => {
    const newId = editedIds[docId] ?? currentId;
    await updateDoc(doc(db, "registrations", docId), {
      "formData.id": newId
    });
    setSaveMessage("ID saved successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const saveHousehold = async (regDocId, userId, currentValue) => {
    const newValue = editedHouseholds[regDocId] !== undefined ? editedHouseholds[regDocId] : currentValue || "";
    await updateDoc(doc(db, "registrations", regDocId), {
      "formData.household": newValue
    });

    // Update in all checkins for this user
    const checkinsQuery = query(
      collection(db, "checkins"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(checkinsQuery);
    const updates = snapshot.docs.map(d =>
      updateDoc(doc(db, "checkins", d.id), { household: newValue })
    );
    await Promise.all(updates);

    setSaveMessage("Household saved successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const saveQueueHousehold = async (checkinId, currentValue, userId) => {
    const newValue = editedQueueHouseholds[checkinId] !== undefined
      ? editedQueueHouseholds[checkinId]
      : currentValue;

    await updateDoc(doc(db, "checkins", checkinId), {
      household: newValue
    });

    const regQuery = query(
      collection(db, "registrations"),
      where("formData.id", "==", userId)
    );
    const regSnapshot = await getDocs(regQuery);
    if (!regSnapshot.empty) {
      const regDocId = regSnapshot.docs[0].id;
      await updateDoc(doc(db, "registrations", regDocId), {
        "formData.household": newValue
      });
    }

    setSaveMessage("Household saved successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const archiveRegistration = async (regId) => {
    await updateDoc(doc(db, "registrations", regId), { "formData.archived": true });
    setSaveMessage("Registration archived successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const unarchiveRegistration = async (regId) => {
    await updateDoc(doc(db, "registrations", regId), { "formData.archived": false });
    setSaveMessage("Registration unarchived successfully!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  useEffect(() => {
    const fetchCounts = async () => {
      const year = Number(counterDate.slice(0, 4));
      const month = Number(counterDate.slice(5, 7)) - 1;
      const day = Number(counterDate.slice(8, 10));
      const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

      const regQuery = query(
        collection(db, "registrations"),
        where("submittedAt", ">=", Timestamp.fromDate(start)),
        where("submittedAt", "<=", Timestamp.fromDate(end))
      );
      const regSnap = await getDocs(regQuery);
      setRegCount(regSnap.size);

      const checkinQuery = query(
        collection(db, "checkins"),
        where("checkInTime", ">=", Timestamp.fromDate(start)),
        where("checkInTime", "<=", Timestamp.fromDate(end))
      );
      const checkinSnap = await getDocs(checkinQuery);
      setCheckinCount(checkinSnap.size);
    };

    fetchCounts();
  }, [counterDate]);

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
      "ethnicity",
      "sex",
      "maritalStatus",
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
      
      // ... add all other keys in your desired order ...
    ];

    const allKeys = desiredKeys;

    // Build the data array with all fields, flattening and stringifying as needed
    const data = filtered.map(reg => {
      const flat = flattenAndStringify(reg.formData || {});
      flat.submittedAt = reg.submittedAt && typeof reg.submittedAt.toDate === "function"
        ? reg.submittedAt.toDate().toLocaleString()
        : "";
      flat.id = reg.id || "";
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

  // Helper for archived queue
  const archivedQueueFiltered = queue.filter(item => {
    if (item.status !== "removed") return false;
    const firstNameMatch = item.name
      ?.toLowerCase()
      .includes(firstNameFilter.toLowerCase());
    const lastName = item.name?.split(" ").slice(-1)[0] || "";
    const lastNameMatch = lastName
      .toLowerCase()
      .includes(lastNameFilter.toLowerCase());
    let dateMatch = true;
    if (startDate) {
      dateMatch =
        dateMatch &&
        item.checkInTime?.toDate() >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      dateMatch =
        dateMatch &&
        item.checkInTime?.toDate() < end;
    }
    return firstNameMatch && lastNameMatch && dateMatch;
  });

  if (loading) return <p>Loading...</p>;

  const filteredQueue = queueStatusFilter === "all"
    ? queue.filter(item => item.status !== "removed")
    : queue.filter(item => item.status === queueStatusFilter);

  const filteredRegistrations = registrations.filter(reg => {
    if (!reg.formData?.archived) return !showArchived;
    if (!showArchived) return false;
    const firstNameMatch = reg.formData.firstName
      ?.toLowerCase()
      .includes(firstNameFilter.toLowerCase());
    const lastNameMatch = reg.formData.lastName
      ?.toLowerCase()
      .includes(lastNameFilter.toLowerCase());
    let dateMatch = true;
    if (startDate) {
      dateMatch = dateMatch && reg.submittedAt?.toDate() >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      dateMatch = dateMatch && reg.submittedAt?.toDate() < end;
    }
    return firstNameMatch && lastNameMatch && dateMatch;
  });

  if (!user) {
    return (
      <div className="login-container">
        <h2>Admin Login</h2>
        {loginError && <div className="alert alert-error">{loginError}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-viewer-container">
      {/* Logout Button */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
        <button
          onClick={handleLogout}
          style={{
            fontSize: "1.5rem", /* Increased by 50% */
            padding: "0.75rem 1.5rem", /* Adjusted padding */
          }}
        >
          Logout
        </button>
      </div>
      {/* Top bar: Counter on right, controls on left */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        {/* Controls on the left */}
        <div>
          {/* View mode toggles */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <label>
              <input
                type="radio"
                value="both"
                checked={viewMode === "both"}
                onChange={() => setViewMode("both")}
              />
              Both
            </label>
            <label>
              <input
                type="radio"
                value="registrations"
                checked={viewMode === "registrations"}
                onChange={() => setViewMode("registrations")}
              />
              Registrations Only
            </label>
            <label>
              <input
                type="radio"
                value="queue"
                checked={viewMode === "queue"}
                onChange={() => setViewMode("queue")}
              />
              Live Check-In Queue Only
            </label>
          </div>
          {/* Archive toggle */}
          <div style={{ marginBottom: "1rem" }}>
            <label>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
                style={{ marginRight: "0.5rem" }}
              />
              Show Archived
            </label>
          </div>
          {/* Filters only when archive is checked */}
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
        </div>
        {/* Counter on the right */}
        <div>
          <div className="counter-stats">
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.3rem", color: "#388e3c" }}>Daily Totals</h2>
            <input
              type="date"
              value={counterDate}
              onChange={e => setCounterDate(e.target.value)}
              className="counter-date"
            />
            <div className="counter-value">
              <span>Registrations</span>
              <strong>{regCount}</strong>
            </div>
            <div className="counter-value">
              <span>Live Check-Ins</span>
              <strong>{checkinCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Only show the registrations table if viewMode is "both" or "registrations" */}
      {(viewMode === "both" || viewMode === "registrations") && (
        <>
          {showArchived ? (
            <h2 className="admin-heading" style={{ textAlign: "center" }}>Archived Registrations</h2>
          ) : (
            <h2 className="admin-heading" style={{ textAlign: "center" }}>Registrations Queue</h2>
          )}

          {/* Conditionally render the export button */}
          {showArchived && (
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <button onClick={exportRegistrations}>Export Registrations (CSV)</button>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Date of Birth</th>
                <th>Phone</th>
                <th>Zip Code</th>
                <th>Submitted At</th>
                <th>Household</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map(reg => (
                <tr key={reg.id}>
                  <td>
                    {reg.formData?.firstName} {reg.formData?.lastName}
                  </td>
                  <td>
                    <input
                      value={editedIds[reg.id] !== undefined ? editedIds[reg.id] : reg.formData?.id || ""}
                      onChange={e => handleIdChange(reg.id, e.target.value)}
                      style={{ width: "100px" }}
                    />
                  </td>
                  <td>{reg.formData?.dateOfBirth}</td>
                  <td>{reg.formData?.phone}</td>
                  <td>{reg.formData?.zipCode}</td>
                  <td>
                    {reg.submittedAt && typeof reg.submittedAt.toDate === "function"
                      ? reg.submittedAt.toDate().toLocaleString()
                      : ""}
                  </td>
                  <td>
                    <input
                      value={editedHouseholds[reg.id] !== undefined ? editedHouseholds[reg.id] : reg.formData?.household || ""}
                      onChange={e => handleHouseholdChange(reg.id, e.target.value)}
                      style={{ width: "100px" }}
                    />
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => saveId(reg.id, reg.formData?.id)}>Save ID</button>
                      <button onClick={() => saveHousehold(reg.id, reg.formData?.id, editedHouseholds[reg.id] ?? reg.formData?.household)}>
                        Save Household
                      </button>
                      {showArchived ? (
                        <button onClick={() => unarchiveRegistration(reg.id)}>Queue</button>
                      ) : (
                        <button onClick={() => archiveRegistration(reg.id)}>Archive</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {saveMessage && (
            <div className="save-message">
              {saveMessage}
            </div>
          )}
        </>
      )}

      {/* Live Check-In Queue Table */}
      {(viewMode === "both" || viewMode === "queue") && !showArchived && (
        <>
          <h2 className="admin-heading">Live Check-In Queue</h2>
          <div className="filter-container">
            <label htmlFor="queueStatusFilter">Filter by status:</label>
            <select id="queueStatusFilter" value={queueStatusFilter} onChange={e => setQueueStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="waiting">Waiting</option>
              <option value="in progress">In Progress</option>
              <option value="served">Served</option>
            </select>
          </div>
          {viewMode !== "registrations" && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Check-In Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Position</th>
                  <th>Household</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td>
                      {item.checkInTime?.seconds
                        ? new Date(item.checkInTime.seconds * 1000).toLocaleTimeString()
                        : ""}
                    </td>
                    <td>{item.status}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => updateStatus(item.id, "in progress")}>In Progress</button>
                        <button onClick={() => updateStatus(item.id, "served")}>Served</button>
                        <button onClick={() => removeCheckin(item.id)}>Remove</button>
                      </div>
                    </td>
                    <td>{item.status === "waiting" ? idx + 1 : "-"}</td>
                    <td>
                      <input
                        value={editedQueueHouseholds[item.id] !== undefined ? editedQueueHouseholds[item.id] : item.household || ""}
                        onChange={e => handleQueueHouseholdChange(item.id, e.target.value)}
                        style={{ width: "100px" }}
                      />
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => saveQueueHousehold(item.id, item.household, item.userId)}>
                          Save Household
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Archived Live Check-In Queue Table */}
      {(viewMode === "both" || viewMode === "queue") && showArchived && (
        <>
          <h2 className="admin-heading">Archived Live Check-In Queue</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Check-In Time</th>
                <th>Status</th>
                <th>Household</th>
              </tr>
            </thead>
            <tbody>
              {archivedQueueFiltered.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>{item.name}</td>
                  <td>
                    {item.checkInTime?.seconds
                      ? new Date(item.checkInTime.seconds * 1000).toLocaleTimeString()
                      : ""}
                  </td>
                  <td>{item.status}</td>
                  <td>{item.household}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Test PDF Export Button - For development only */}
    </div>
  );
}

export default AdminViewer;

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}
