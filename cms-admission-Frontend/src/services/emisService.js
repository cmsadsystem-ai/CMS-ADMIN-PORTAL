const demoStudents = [
  {
    emisId: 'CMS-EMIS-1001',
    studentName: 'Aarav Natarajan',
    fatherName: 'Natarajan K',
    fatherOccupation: 'Business Owner',
    motherName: 'Shanthi Natarajan',
    motherOccupation: 'Teacher',
    dateOfBirth: '2008-05-12',
    gender: 'Male',
    aadhaar: '4234 5678 9012',
    studentMobile: '9876543210',
    email: 'aarav.natarajan@example.com',
    parentMobile: '9845678901',
    community: 'BC',
    bloodGroup: 'O+',
    communicationAddress: '12, Lakshmi Nagar, Namakkal',
    district: 'Namakkal',
    state: 'Tamil Nadu',
    pinCode: '637001',
    schoolName: 'Government Higher Secondary School, Namakkal',
    schoolAddress: 'Subramaniam Road, Namakkal',
    category: 'Government Quota',
    firstGraduate: 'Yes',
    mathematics: 96,
    physicsTheory: 94,
    physicsPractical: 98,
    chemistryTheory: 92,
    chemistryPractical: 96,
    coursePreference: {
      firstPreference: 'Artificial Intelligence & Data Science',
      additionalPreferences: ['Computer Science & Engineering'],
    },
  },
  {
    emisId: 'CMS-EMIS-1002',
    studentName: 'Priya Selvam',
    fatherName: 'Selvam M',
    fatherOccupation: 'Bank Manager',
    motherName: 'Meena Selvam',
    motherOccupation: 'Nurse',
    dateOfBirth: '2008-02-18',
    gender: 'Female',
    aadhaar: '3321 7789 4456',
    studentMobile: '9123456780',
    email: 'priya.selvam@example.com',
    parentMobile: '9098765432',
    community: 'MBC',
    bloodGroup: 'A+',
    communicationAddress: '8, Kamaraj Street, Tiruchengode',
    district: 'Namakkal',
    state: 'Tamil Nadu',
    pinCode: '637205',
    schoolName: 'Sree Venkateswara Matric Higher Secondary School',
    schoolAddress: 'Tiruchengode Main Road',
    category: 'Management Quota',
    firstGraduate: 'No',
    mathematics: 88,
    physicsTheory: 85,
    physicsPractical: 90,
    chemistryTheory: 83,
    chemistryPractical: 89,
    coursePreference: {
      firstPreference: 'Computer Science & Engineering',
      additionalPreferences: ['Electronics and Communication Engineering', 'Artificial Intelligence & Machine Learning'],
    },
  },
  {
    emisId: 'CMS-EMIS-1003',
    studentName: 'Karthik Raja',
    fatherName: 'Raja P',
    fatherOccupation: 'Electrical Technician',
    motherName: 'Vijaya Raja',
    motherOccupation: 'Home Maker',
    dateOfBirth: '2009-09-25',
    gender: 'Male',
    aadhaar: '6654 2233 8811',
    studentMobile: '9988776655',
    email: 'karthik.raja@example.com',
    parentMobile: '9922334455',
    community: 'SC',
    bloodGroup: 'B+',
    communicationAddress: '26, Gandhi Nagar, Salem',
    district: 'Salem',
    state: 'Tamil Nadu',
    pinCode: '636001',
    schoolName: 'Kongu Vaigai Higher Secondary School',
    schoolAddress: 'Mettur Road, Salem',
    category: 'Government Quota',
    firstGraduate: 'Yes',
    mathematics: 91,
    physicsTheory: 90,
    physicsPractical: 92,
    chemistryTheory: 88,
    chemistryPractical: 90,
    coursePreference: {
      firstPreference: 'Electronics and Communication Engineering',
      additionalPreferences: ['CSE – Cyber Security'],
    },
  },
];

export async function fetchDemoStudent(emisId) {
  const normalized = String(emisId || '').trim().toUpperCase();

  if (!normalized) {
    return {
      ok: false,
      error: 'Please enter an EMIS ID to fetch the demo record.',
      manualEntryRequired: true,
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 700));

  const found = demoStudents.find((student) => student.emisId.toUpperCase() === normalized);

  if (!found) {
    return {
      ok: false,
      error: 'No demo record matched this EMIS ID. You can continue with manual data entry.',
      manualEntryRequired: true,
    };
  }

  return {
    ok: true,
    student: found,
    message: `Demo EMIS data loaded for ${found.studentName}. This is mock data for frontend demo only; real EMIS lookup requires authorised backend integration.`,
  };
}

export const demoEmisIds = demoStudents.map((student) => student.emisId);
