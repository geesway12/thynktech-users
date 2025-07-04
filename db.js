export function saveDb() {
  localStorage.setItem("thynktech_db", JSON.stringify(db));
}

export function loadDb() {
  const stored = localStorage.getItem("thynktech_db");
  if (stored) {
    const loaded = JSON.parse(stored);
    Object.keys(db).forEach(key => db[key] = loaded[key]);
  }
  // Ensure all arrays/objects are initialized
  db.users = db.users || [];
  db.patients = db.patients || [];
  db.visits = db.visits || [];
  db.appointments = db.appointments || [];
  db.serviceEntries = db.serviceEntries || {};
  db.registers = db.registers || [];
  db.servicesList = db.servicesList || [];
  db.customPatientFields = db.customPatientFields || [];
  db.currentUser = db.currentUser || null;
  // Ensure lastPasswordChange exists for all users
  db.users.forEach(u => {
    if (!u.lastPasswordChange) u.lastPasswordChange = Date.now();
  });
}

export const db = {
  users: [
    { 
      username: "nurse1", 
      password: "nursepass", 
      role: "nurse",
      assignedRegisters: ["OPD", "ANC"], // Assigned service registers
      fullName: "Nurse One",
      category: "Nurse",
      contact: "0243445566",
      lastPasswordChange: Date.now() // Track password update time
    }
    // Add more user accounts as needed, each with assignedRegisters, fullName, category, contact, lastPasswordChange
  ],
  patients: [],
  visits: [],
  appointments: [],
  serviceEntries: {},
  registers: [], // Store service registers imported from admin
  servicesList: ["OPD", "ANC", "Immunization", "Lab"], // All available services
  currentUser: null,
  customPatientFields: []
};

