import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Save, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import FileUploadField from '../components/FileUploadField';
import { fetchDemoStudent } from '../services/emisService';
import { calculateCutoff, PROGRAMME_COURSES } from '../utils/helpers';

const steps = [
  'Admission category',
  'Degree and course selection',
  'FG (First Graduate)',
  'Personal information',
  'Parents and guardian',
  'Accommodation',
  'Education details',
  'Documents and signatures',
  'Fees Structure',
];
const certificateLabels = {
  SSLC: 'SSLC Certificate',
  HSC: 'HSC Certificate',
  TC: 'Transfer Certificate (TC)',
  CC: 'Conduct Certificate (CC)',
  NativityCertificate: 'Nativity Certificate',
  IncomeCertificate: 'Income Certificate',
  AadhaarCard: 'Aadhaar Document',
  FirstGraduateCertificate: 'First Graduate Certificate',
  PassportSizePhotographs: 'Student Photo',
};
const tamilNaduDistricts = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanniyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
  'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet',
  'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi',
  'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur',
  'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar',
];
const indianStatesAndTerritories = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];
const communities = ['OC', 'BC', 'BC(M)', 'MBC & DNC', 'SC', 'SC(A)', 'ST', 'SCC'];
const requiredMarks = ['mathematics', 'physicsMarks', 'chemistryMarks'];
const markLabels = {
  mathematics: 'Mathematics',
  physicsMarks: 'Physics',
  chemistryMarks: 'Chemistry',
};

function getIndianMobileError(value) {
  return /^[6-9]\d{9}$/.test(value) ? '' : 'Enter a valid 10-digit Indian mobile number starting with 6–9.';
}

function getLegacySubjectMarks(theory, practical) {
  if (theory === '' || theory == null || practical === '' || practical == null) return '';
  const average = (Number(theory) + Number(practical)) / 2;
  return Number.isFinite(average) ? String(average) : '';
}

function normalizeAdmissionCategory(category) {
  if (category === 'Management Quota') return 'Management';
  if (category === 'Counselling Quota') return 'Counselling';
  return category === 'Management' || category === 'Counselling' ? category : '';
}

function formatAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { draft, saveDraft } = useAppContext();
  const savedProgramme = draft?.programme || '';
  const savedDegree = PROGRAMME_COURSES[savedProgramme]?.[draft?.degree] ? draft.degree : '';
  const savedCourses = PROGRAMME_COURSES[savedProgramme]?.[savedDegree] || [];
  const requestedStep = Number(new URLSearchParams(window.location.search).get('step'));
  const [currentStep, setCurrentStep] = useState(() => (
    requestedStep >= 1 && requestedStep <= steps.length
      ? requestedStep
      : 1
  ));
  const [todayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState({});
  const [emisStatus, setEmisStatus] = useState('idle');
  const [emisMessage, setEmisMessage] = useState('');
  const [isFetchingEmis, setIsFetchingEmis] = useState(false);
  const [formData, setFormData] = useState(() => ({
    ...draft,
    signature: null,
    aadhaar: formatAadhaar(draft?.aadhaar),
    admissionCategory: normalizeAdmissionCategory(draft?.admissionCategory),
    programme: savedProgramme,
    degree: savedDegree,
    physicsMarks: draft?.physicsMarks ?? getLegacySubjectMarks(draft?.physicsTheory, draft?.physicsPractical),
    chemistryMarks: draft?.chemistryMarks ?? getLegacySubjectMarks(draft?.chemistryTheory, draft?.chemistryPractical),
    fatherMobile: draft?.fatherMobile || draft?.parentMobile || '',
    coursePreference: {
      firstPreference: savedCourses.includes(draft?.coursePreference?.firstPreference)
        ? draft.coursePreference.firstPreference
        : '',
      additionalPreferences: (draft?.coursePreference?.additionalPreferences || [])
        .filter((course) => savedCourses.includes(course)),
    },
    certificates: draft?.certificates || {},
    documents: draft?.documents || {},
    fees: draft?.fees || {},
    accommodation: draft?.accommodation || '',
    studentSignature: draft?.studentSignature || draft?.signature || null,
    parentSignature: draft?.parentSignature || null,
  }));

  const availableCourses = PROGRAMME_COURSES[formData.programme]?.[formData.degree] || [];
  const cutOffValue = useMemo(() => calculateCutoff({
    mathematics: formData.mathematics,
    physics: formData.physicsMarks,
    chemistry: formData.chemistryMarks,
  }), [formData.mathematics, formData.physicsMarks, formData.chemistryMarks]);
  const completedStepCount = useMemo(() => {
    const isValidMark = (value) => (
      value !== '' && value !== null && value !== undefined
      && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100
    );
    const isValidHscMark = formData.hscMarks !== '' && formData.hscMarks !== null
      && formData.hscMarks !== undefined && Number.isFinite(Number(formData.hscMarks))
      && Number(formData.hscMarks) >= 0 && Number(formData.hscMarks) <= 600;
    const stepsComplete = [
      Boolean(formData.admissionCategory),
      Boolean(formData.programme && formData.degree
        && (!availableCourses.length || formData.coursePreference.firstPreference)),
      ['Yes', 'No'].includes(formData.firstGraduate),
      Boolean(
        ['studentName', 'dateOfBirth', 'gender', 'aadhaar', 'bloodGroup', 'community', 'category',
          'studentMobile', 'email', 'communicationAddress', 'district', 'state', 'pinCode']
          .every((field) => String(formData[field] || '').trim())
        && formData.dateOfBirth <= todayDate
        && !getIndianMobileError(formData.studentMobile)
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData.email || '').trim())
        && /^\d{12}$/.test(formData.aadhaar.replace(/\s/g, ''))
        && /^\d{6}$/.test(formData.pinCode),
      ),
      Boolean(
        ['fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'fatherMobile', 'motherMobile']
          .every((field) => String(formData[field] || '').trim())
        && !getIndianMobileError(formData.fatherMobile)
        && !getIndianMobileError(formData.motherMobile)
        && (!formData.guardianMobile || !getIndianMobileError(formData.guardianMobile)),
      ),
      Boolean(formData.accommodation
        && (formData.accommodation !== 'Day Scholar' || String(formData.busRoute || '').trim())),
      Boolean(
        String(formData.schoolName || '').trim()
        && String(formData.schoolAddress || '').trim()
        && isValidHscMark
        && requiredMarks.every((field) => isValidMark(formData[field])),
      ),
      Boolean(
        formData.declaration
        && formData.parentDeclaration
        && (formData.studentSignature?.dataUrl || formData.signature?.dataUrl)
        && formData.parentSignature?.dataUrl,
      ),
      currentStep >= 9,
    ];
    let count = 0;
    for (const complete of stepsComplete) {
      if (!complete) break;
      count += 1;
    }
    return count;
  }, [formData, currentStep, availableCourses.length, todayDate]);

  useEffect(() => {
    saveDraft({ ...formData, cutOffMarks: cutOffValue ?? '', workflowStep: currentStep, workflowVersion: 2 });
  }, [formData, currentStep, cutOffValue, saveDraft]);

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: '' }));
  };

  const updateProgramme = (programme) => {
    setFormData((previous) => ({
      ...previous,
      programme,
      degree: '',
      coursePreference: { firstPreference: '', additionalPreferences: [] },
    }));
    setErrors((previous) => ({ ...previous, degree: '', firstPreference: '' }));
  };

  const updateDegree = (degree) => {
    setFormData((previous) => ({
      ...previous,
      degree,
      coursePreference: { firstPreference: '', additionalPreferences: [] },
    }));
    setErrors((previous) => ({ ...previous, degree: '', firstPreference: '' }));
  };

  const validateStep = () => {
    const nextErrors = {};

    if (currentStep === 1) {
      if (!formData.admissionCategory) nextErrors.admissionCategory = 'Choose Management or Counselling.';
    }

    if (currentStep === 2) {
      if (!formData.programme) nextErrors.programme = 'Choose UG or PG.';
      if (formData.programme && !formData.degree) nextErrors.degree = 'Choose a degree.';
      if (availableCourses.length && !formData.coursePreference.firstPreference) {
        nextErrors.firstPreference = 'Choose a course.';
      }
    }

    if (currentStep === 3 && !['Yes', 'No'].includes(formData.firstGraduate)) {
      nextErrors.firstGraduate = 'Select Yes or No.';
    }

    if (currentStep === 4) {
      [
        'studentName',
        'dateOfBirth',
        'gender',
        'aadhaar',
        'bloodGroup',
        'community',
        'category',
        'studentMobile',
        'communicationAddress',
        'district',
        'state',
        'pinCode',
      ].forEach((field) => {
        if (!String(formData[field] || '').trim()) nextErrors[field] = 'This field is required.';
      });
      if (formData.dateOfBirth && new Date(`${formData.dateOfBirth}T00:00:00`) > new Date()) {
        nextErrors.dateOfBirth = 'Date of birth cannot be in the future.';
      }
      if (formData.studentMobile) {
        const mobileError = getIndianMobileError(formData.studentMobile);
        if (mobileError) nextErrors.studentMobile = mobileError;
      }
      if (!String(formData.email || '').trim()) {
        nextErrors.email = 'Email ID is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData.email || '').trim())) {
        nextErrors.email = 'Enter a valid email address.';
      }
      if (formData.aadhaar && !/^\d{12}$/.test(formData.aadhaar.replace(/\s/g, ''))) {
        nextErrors.aadhaar = 'Aadhaar number must contain 12 digits.';
      }
      if (formData.pinCode && !/^\d{6}$/.test(formData.pinCode)) {
        nextErrors.pinCode = 'PIN code must contain exactly 6 digits.';
      }
    }

    if (currentStep === 5) {
      ['fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'fatherMobile', 'motherMobile'].forEach((field) => {
        if (!String(formData[field] || '').trim()) nextErrors[field] = 'This field is required.';
      });
      ['fatherMobile', 'motherMobile'].forEach((field) => {
        if (formData[field]) {
          const mobileError = getIndianMobileError(formData[field]);
          if (mobileError) nextErrors[field] = mobileError;
        }
      });
      if (formData.guardianMobile) {
        const mobileError = getIndianMobileError(formData.guardianMobile);
        if (mobileError) nextErrors.guardianMobile = mobileError;
      }
    }

    if (currentStep === 6 && !formData.accommodation) {
      nextErrors.accommodation = 'Choose Hostel or Day Scholar.';
    }
    if (currentStep === 6 && formData.accommodation === 'Day Scholar' && !String(formData.busRoute || '').trim()) {
      nextErrors.busRoute = 'Bus route is required for Day Scholars.';
    }
    if (currentStep === 7) {
      if (!String(formData.schoolName || '').trim()) nextErrors.schoolName = 'School name is required.';
      if (!String(formData.schoolAddress || '').trim()) nextErrors.schoolAddress = 'School address is required.';
      if (formData.hscMarks === '' || formData.hscMarks === null || formData.hscMarks === undefined) {
        nextErrors.hscMarks = 'Class 12 / HSC marks are required.';
      } else if (!Number.isFinite(Number(formData.hscMarks)) || Number(formData.hscMarks) < 0 || Number(formData.hscMarks) > 600) {
        nextErrors.hscMarks = 'Class 12 total marks must be between 0 and 600.';
      }
      requiredMarks.forEach((field) => {
        const value = formData[field];
        if (value === '' || value === null || value === undefined
          || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) {
          nextErrors[field] = 'Enter a valid mark from 0 to 100.';
        }
      });
    }

    if (currentStep === 8) {
      if (!formData.declaration) nextErrors.declaration = 'You must agree to the declaration.';
      if (!formData.parentDeclaration) nextErrors.parentDeclaration = 'Parent declaration is required.';
      if (!formData.studentSignature?.dataUrl && !formData.signature?.dataUrl) {
        nextErrors.studentSignature = 'Student signature is required.';
      }
      if (!formData.parentSignature?.dataUrl) {
        nextErrors.parentSignature = 'Parent signature is required.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setCurrentStep((step) => Math.min(step + 1, steps.length));
  };

  const goPrevious = () => {
    setErrors({});
    if (currentStep === 1) {
      navigate('/');
      return;
    }
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleSaveDraft = () => {
    saveDraft({ ...formData, cutOffMarks: cutOffValue ?? '', workflowStep: currentStep, workflowVersion: 2 });
    window.alert('Draft saved locally in this browser.');
  };

  const handleFetchEmis = async () => {
    setIsFetchingEmis(true);
    setEmisStatus('loading');
    setEmisMessage('Loading demo EMIS data...');

    try {
      const result = await fetchDemoStudent(formData.emisId);
      const record = result?.student;
      if (result.ok && record) {
        setFormData((previous) => ({
          ...previous,
          studentName: record.studentName,
          fatherName: record.fatherName,
          fatherOccupation: record.fatherOccupation,
          motherName: record.motherName,
          motherOccupation: record.motherOccupation,
          dateOfBirth: record.dateOfBirth,
          gender: record.gender,
          aadhaar: formatAadhaar(record.aadhaar),
          studentMobile: record.studentMobile,
          email: record.email || previous.email || '',
          parentMobile: record.parentMobile,
          fatherMobile: record.parentMobile,
          community: record.community,
          bloodGroup: record.bloodGroup,
          communicationAddress: record.communicationAddress,
          district: record.district,
          state: record.state,
          pinCode: record.pinCode,
          schoolName: record.schoolName,
          schoolAddress: record.schoolAddress,
          mathematics: record.mathematics,
          physicsTheory: record.physicsTheory,
          physicsPractical: record.physicsPractical,
          chemistryTheory: record.chemistryTheory,
          chemistryPractical: record.chemistryPractical,
          physicsMarks: getLegacySubjectMarks(record.physicsTheory, record.physicsPractical),
          chemistryMarks: getLegacySubjectMarks(record.chemistryTheory, record.chemistryPractical),
          firstGraduate: record.firstGraduate,
        }));
        setEmisStatus('success');
        setEmisMessage(result.message);
      } else {
        setEmisStatus('error');
        setEmisMessage(result.error || 'No matching EMIS record found.');
      }
    } catch {
      setEmisStatus('error');
      setEmisMessage('Unable to fetch the demo EMIS details. Manual entry is still available.');
    } finally {
      setIsFetchingEmis(false);
    }
  };

  const updateCoursePreference = (course) => {
    setFormData((previous) => ({
      ...previous,
      coursePreference: {
        firstPreference: course,
        additionalPreferences: [],
      },
    }));
    setErrors((previous) => ({ ...previous, firstPreference: '' }));
  };

  const renderAdmissionCategoryStep = () => (
    <div className="form-grid">
      <fieldset className="field-group choice-fieldset">
        <legend>Admission category <span className="required-indicator">*</span></legend>
        <div className="choice-grid two-choice-grid">
          {['Management', 'Counselling'].map((category) => (
            <button
              key={category}
              type="button"
              className={`choice-card ${formData.admissionCategory === category ? 'active' : ''}`}
              aria-pressed={formData.admissionCategory === category}
              onClick={() => updateField('admissionCategory', category)}
            >
              {category}
            </button>
          ))}
        </div>
        {errors.admissionCategory ? <small className="error-text">{errors.admissionCategory}</small> : null}
      </fieldset>
    </div>
  );

  const renderProgrammeStep = () => (
    <div className="form-grid">
      <fieldset className="field-group choice-fieldset">
        <legend>Programme <span className="required-indicator">*</span></legend>
        <div className="choice-grid two-choice-grid">
          {['UG', 'PG'].map((programme) => (
            <button
              key={programme}
              type="button"
              className={`choice-card ${formData.programme === programme ? 'active' : ''}`}
              aria-pressed={formData.programme === programme}
              onClick={() => updateProgramme(programme)}
            >
              {programme}
            </button>
          ))}
        </div>
        {errors.programme ? <small className="error-text">{errors.programme}</small> : null}
      </fieldset>

      {formData.programme ? (
        <fieldset className="field-group choice-fieldset">
          <legend>Degree <span className="required-indicator">*</span></legend>
          <div className="choice-grid two-choice-grid">
            {Object.keys(PROGRAMME_COURSES[formData.programme]).map((degree) => (
              <button
                key={degree}
                type="button"
                className={`choice-card ${formData.degree === degree ? 'active' : ''}`}
                aria-pressed={formData.degree === degree}
                onClick={() => updateDegree(degree)}
              >
                {degree}
              </button>
            ))}
          </div>
          {errors.degree ? <small className="error-text">{errors.degree}</small> : null}
        </fieldset>
      ) : null}

      {formData.degree ? (
        <div className="field-group full-width">
          <label>Course {availableCourses.length ? <span className="required-indicator">*</span> : null}</label>
          {availableCourses.length ? (
            <>
              <div className="choice-grid">
                {availableCourses.map((course) => (
                  <button
                    key={course}
                    type="button"
                    className={`choice-card ${formData.coursePreference.firstPreference === course ? 'active' : ''}`}
                    aria-pressed={formData.coursePreference.firstPreference === course}
                    onClick={() => updateCoursePreference(course)}
                  >
                    {course}
                  </button>
                ))}
              </div>
              {errors.firstPreference ? <small className="error-text">{errors.firstPreference}</small> : null}
            </>
          ) : (
            <div className="notice-box">
              Approved courses for {formData.degree} have not been configured. Ask the college to add its approved course list in
              {' '}<code>PROGRAMME_COURSES</code> in <code>src/utils/helpers.js</code>. No course has been assumed.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const renderFirstGraduateStep = () => (
    <div className="form-grid">
      <fieldset className="field-group choice-fieldset">
        <legend>Are you a First Graduate? <span className="required-indicator">*</span></legend>
        <div className="choice-grid two-choice-grid">
          {['Yes', 'No'].map((answer) => (
            <button
              key={answer}
              type="button"
              className={`choice-card ${formData.firstGraduate === answer ? 'active' : ''}`}
              aria-pressed={formData.firstGraduate === answer}
              onClick={() => updateField('firstGraduate', answer)}
            >
              {answer}
            </button>
          ))}
        </div>
        {errors.firstGraduate ? <small className="error-text">{errors.firstGraduate}</small> : null}
      </fieldset>
    </div>
  );

  const renderPersonalStep = () => (
    <div className="form-grid two-column">
      <div className="field-group full-width">
        <label htmlFor="emisId">EMIS ID (optional)</label>
        <div className="inline-field-row">
          <input id="emisId" value={formData.emisId || ''} onChange={(event) => updateField('emisId', event.target.value.toUpperCase())} />
          <button type="button" className="secondary-btn compact" onClick={handleFetchEmis} disabled={isFetchingEmis}>
            <Search size={16} /> {isFetchingEmis ? 'Fetching...' : 'Fetch demo details'}
          </button>
        </div>
        {emisStatus !== 'idle' ? <small className={emisStatus === 'success' ? 'success-text' : 'error-text'} role="status">{emisMessage}</small> : null}
      </div>
      <div className="field-group full-width">
        <label htmlFor="studentName">Full Name <span className="required-indicator">*</span></label>
        <input id="studentName" required autoComplete="name" value={formData.studentName || ''} onChange={(event) => updateField('studentName', event.target.value)} />
        {errors.studentName ? <small className="error-text">{errors.studentName}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="dateOfBirth">Date of Birth <span className="required-indicator">*</span></label>
        <input id="dateOfBirth" type="date" required value={formData.dateOfBirth || ''} onChange={(event) => updateField('dateOfBirth', event.target.value)} />
        {errors.dateOfBirth ? <small className="error-text">{errors.dateOfBirth}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="gender">Gender <span className="required-indicator">*</span></label>
        <select id="gender" required value={formData.gender || ''} onChange={(event) => updateField('gender', event.target.value)}>
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Transgender">Transgender</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>
        {errors.gender ? <small className="error-text">{errors.gender}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="aadhaar">Aadhaar Number <span className="required-indicator">*</span></label>
        <input id="aadhaar" type="text" required inputMode="numeric" pattern="[0-9]{4} [0-9]{4} [0-9]{4}" maxLength={14} placeholder="0000 0000 0000" autoComplete="off" value={formData.aadhaar || ''} onChange={(event) => updateField('aadhaar', formatAadhaar(event.target.value))} />
        {errors.aadhaar ? <small className="error-text">{errors.aadhaar}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="bloodGroup">Blood Group <span className="required-indicator">*</span></label>
        <select id="bloodGroup" required value={formData.bloodGroup || ''} onChange={(event) => updateField('bloodGroup', event.target.value)}>
          <option value="">Select blood group</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}
        </select>
        {errors.bloodGroup ? <small className="error-text">{errors.bloodGroup}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="community">Community <span className="required-indicator">*</span></label>
        <select id="community" required value={formData.community || ''} onChange={(event) => updateField('community', event.target.value)}>
          <option value="">Choose community</option>
          {communities.map((community) => <option key={community} value={community}>{community}</option>)}
        </select>
        {errors.community ? <small className="error-text">{errors.community}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="category">Category <span className="required-indicator">*</span></label>
        <input
          id="category"
          type="text"
          required
          value={formData.category || ''}
          onChange={(event) => updateField('category', event.target.value)}
          placeholder="Type category"
        />
        {errors.category ? <small className="error-text">{errors.category}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="studentMobile">Mobile Number <span className="required-indicator">*</span></label>
        <div className="phone-input">
          <span aria-hidden="true">+91</span>
          <input id="studentMobile" type="tel" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel-national" value={formData.studentMobile || ''} onChange={(event) => updateField('studentMobile', event.target.value.replace(/\D/g, '').slice(0, 10))} />
        </div>
        {errors.studentMobile ? <small className="error-text">{errors.studentMobile}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="email">Email ID <span className="required-indicator">*</span></label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="student@example.com"
          value={formData.email || ''}
          onChange={(event) => updateField('email', event.target.value)}
        />
        {errors.email ? <small className="error-text">{errors.email}</small> : null}
      </div>
      <div className="field-group full-width">
        <label htmlFor="communicationAddress">Communication Address <span className="required-indicator">*</span></label>
        <textarea id="communicationAddress" required rows="3" value={formData.communicationAddress || ''} onChange={(event) => updateField('communicationAddress', event.target.value)} />
        {errors.communicationAddress ? <small className="error-text">{errors.communicationAddress}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="district">District <span className="required-indicator">*</span></label>
        <select id="district" required value={formData.district || ''} onChange={(event) => updateField('district', event.target.value)}>
          <option value="">Choose district</option>
          {tamilNaduDistricts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
        {errors.district ? <small className="error-text">{errors.district}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="state">State <span className="required-indicator">*</span></label>
        <select id="state" required value={formData.state || ''} onChange={(event) => updateField('state', event.target.value)}>
          <option value="">Choose state / UT</option>
          {indianStatesAndTerritories.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        {errors.state ? <small className="error-text">{errors.state}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="pinCode">PIN Code <span className="required-indicator">*</span></label>
        <input id="pinCode" type="text" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={formData.pinCode || ''} onChange={(event) => updateField('pinCode', event.target.value.replace(/\D/g, '').slice(0, 6))} />
        {errors.pinCode ? <small className="error-text">{errors.pinCode}</small> : null}
      </div>
    </div>
  );

  const renderParentsStep = () => (
    <div className="form-grid two-column">
      <div className="field-group">
        <label htmlFor="fatherName">Father Name <span className="required-indicator">*</span></label>
        <input id="fatherName" required value={formData.fatherName || ''} onChange={(event) => updateField('fatherName', event.target.value)} />
        {errors.fatherName ? <small className="error-text">{errors.fatherName}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="motherName">Mother Name <span className="required-indicator">*</span></label>
        <input id="motherName" required value={formData.motherName || ''} onChange={(event) => updateField('motherName', event.target.value)} />
        {errors.motherName ? <small className="error-text">{errors.motherName}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="fatherOccupation">Father Occupation <span className="required-indicator">*</span></label>
        <input id="fatherOccupation" required value={formData.fatherOccupation || ''} onChange={(event) => updateField('fatherOccupation', event.target.value)} />
        {errors.fatherOccupation ? <small className="error-text">{errors.fatherOccupation}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="motherOccupation">Mother Occupation <span className="required-indicator">*</span></label>
        <input id="motherOccupation" required value={formData.motherOccupation || ''} onChange={(event) => updateField('motherOccupation', event.target.value)} />
        {errors.motherOccupation ? <small className="error-text">{errors.motherOccupation}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="fatherMobile">Father Mobile Number <span className="required-indicator">*</span></label>
        <div className="phone-input">
          <span aria-hidden="true">+91</span>
          <input id="fatherMobile" type="tel" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={formData.fatherMobile || ''} onChange={(event) => updateField('fatherMobile', event.target.value.replace(/\D/g, '').slice(0, 10))} />
        </div>
        {errors.fatherMobile ? <small className="error-text">{errors.fatherMobile}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="motherMobile">Mother Mobile Number <span className="required-indicator">*</span></label>
        <div className="phone-input">
          <span aria-hidden="true">+91</span>
          <input id="motherMobile" type="tel" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={formData.motherMobile || ''} onChange={(event) => updateField('motherMobile', event.target.value.replace(/\D/g, '').slice(0, 10))} />
        </div>
        {errors.motherMobile ? <small className="error-text">{errors.motherMobile}</small> : null}
      </div>
      <div className="field-group"><label htmlFor="guardianName">Guardian Name (optional)</label><input id="guardianName" value={formData.guardianName || ''} onChange={(event) => updateField('guardianName', event.target.value)} /></div>
      <div className="field-group"><label htmlFor="guardianOccupation">Guardian Occupation (optional)</label><input id="guardianOccupation" value={formData.guardianOccupation || ''} onChange={(event) => updateField('guardianOccupation', event.target.value)} /></div>
      <div className="field-group">
        <label htmlFor="guardianMobile">Guardian Mobile Number (optional)</label>
        <div className="phone-input">
          <span aria-hidden="true">+91</span>
          <input id="guardianMobile" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={formData.guardianMobile || ''} onChange={(event) => updateField('guardianMobile', event.target.value.replace(/\D/g, '').slice(0, 10))} />
        </div>
        {errors.guardianMobile ? <small className="error-text">{errors.guardianMobile}</small> : null}
      </div>
      <p className="field-help full-width">Guardian details are optional. Complete the required parent fields to continue.</p>
    </div>
  );

  const renderAccommodationStep = () => (
    <div className="form-grid">
      <fieldset className="field-group choice-fieldset">
        <legend>Accommodation <span className="required-indicator">*</span></legend>
        <div className="choice-grid two-choice-grid">
          {['Hostel', 'Day Scholar'].map((accommodation) => (
            <button
              key={accommodation}
              type="button"
              className={`choice-card ${formData.accommodation === accommodation ? 'active' : ''}`}
              aria-pressed={formData.accommodation === accommodation}
              onClick={() => {
                setFormData((previous) => ({
                  ...previous,
                  accommodation,
                  hostelAccommodation: accommodation === 'Hostel' ? 'Yes' : 'No',
                  hostelApplication: accommodation === 'Hostel' ? 'Yes' : 'No',
                  transportApplication: accommodation === 'Day Scholar' ? 'Yes' : 'No',
                  ...(accommodation === 'Hostel' ? { busRoute: '', transportRequirements: '' } : {}),
                }));
                setErrors((previous) => ({ ...previous, accommodation: '' }));
              }}
            >
              {accommodation}
            </button>
          ))}
        </div>
        {errors.accommodation ? <small className="error-text">{errors.accommodation}</small> : null}
      </fieldset>
      {formData.accommodation === 'Day Scholar' ? (
        <div className="form-grid two-column">
          <div className="field-group">
            <label htmlFor="busRoute">Bus Route <span className="required-indicator">*</span></label>
            <input id="busRoute" required value={formData.busRoute || ''} onChange={(event) => updateField('busRoute', event.target.value)} />
            {errors.busRoute ? <small className="error-text">{errors.busRoute}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="transportRequirements">Transport Requirements (optional)</label>
            <input id="transportRequirements" value={formData.transportRequirements || ''} onChange={(event) => updateField('transportRequirements', event.target.value)} />
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderEducationStep = () => (
    <div className="form-grid two-column">
      <div className="field-group full-width">
        <label htmlFor="schoolName">School Name <span className="required-indicator">*</span></label>
        <input id="schoolName" required value={formData.schoolName || ''} onChange={(event) => updateField('schoolName', event.target.value)} />
        {errors.schoolName ? <small className="error-text">{errors.schoolName}</small> : null}
      </div>
      <div className="field-group full-width">
        <label htmlFor="schoolAddress">School Address <span className="required-indicator">*</span></label>
        <textarea id="schoolAddress" required rows="3" value={formData.schoolAddress || ''} onChange={(event) => updateField('schoolAddress', event.target.value)} />
        {errors.schoolAddress ? <small className="error-text">{errors.schoolAddress}</small> : null}
      </div>
      <div className="field-group">
        <label htmlFor="hscMarks">Class 12 / HSC Marks (out of 600) <span className="required-indicator">*</span></label>
        <input
          id="hscMarks"
          type="number"
          required
          min="0"
          max="600"
          step="any"
          placeholder="0 - 600"
          value={formData.hscMarks ?? ''}
          onWheel={(e) => e.target.blur()}
          onChange={(event) => {
            const rawVal = event.target.value;
            if (rawVal === '') {
              updateField('hscMarks', '');
            } else {
              const num = Number(rawVal);
              if (num > 600) {
                updateField('hscMarks', 600);
              } else if (num < 0) {
                updateField('hscMarks', 0);
              } else {
                updateField('hscMarks', rawVal);
              }
            }
          }}
        />
        {errors.hscMarks ? <small className="error-text">{errors.hscMarks}</small> : null}
      </div>
      {requiredMarks.map((field) => (
        <div className="field-group" key={field}>
          <label htmlFor={field}>{markLabels[field]} Marks (out of 100) <span className="required-indicator">*</span></label>
          <input
            id={field}
            type="number"
            min="0"
            max="100"
            step="any"
            placeholder="0 - 100"
            value={formData[field] ?? ''}
            onWheel={(e) => e.target.blur()}
            onChange={(event) => {
              const rawVal = event.target.value;
              if (rawVal === '') {
                updateField(field, '');
              } else {
                const num = Number(rawVal);
                if (num > 100) {
                  updateField(field, 100);
                } else if (num < 0) {
                  updateField(field, 0);
                } else {
                  updateField(field, rawVal);
                }
              }
            }}
          />
          {errors[field] ? <small className="error-text">{errors[field]}</small> : null}
        </div>
      ))}
      <div className="field-group full-width summary-box cutoff-summary" aria-live="polite">
        <strong>Automatically calculated cutoff</strong>
        <p>{cutOffValue === null ? 'Enter valid Mathematics, Physics, and Chemistry marks (0–100 each) to calculate.' : `${cutOffValue.toFixed(2)} / 200`}</p>
        <small>Cutoff = Mathematics + (Physics / 2) + (Chemistry / 2)</small>
      </div>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="card-list">
      <h3>Upload documents (optional)</h3>
      <div className="certificate-upload-grid">
        {Object.entries(certificateLabels).map(([key, label]) => (
          <FileUploadField
            key={key}
            label={label}
            imageOnly={key === 'PassportSizePhotographs'}
            value={formData.documents?.[key] || null}
            onChange={(file) => setFormData((previous) => ({
              ...previous,
              documents: { ...previous.documents, [key]: file },
            }))}
          />
        ))}
      </div>

      <div className="signature-sections">
        <section className="signature-section">
          <h3>Student Signature</h3>
          <FileUploadField
            label="Student signature (required)"
            signature
            value={formData.studentSignature}
            onChange={(file) => updateField('studentSignature', file)}
          />
          {errors.studentSignature ? <small className="error-text">{errors.studentSignature}</small> : null}
        </section>
        <section className="signature-section">
          <h3>Parent Signature</h3>
          <FileUploadField
            label="Parent signature (required)"
            signature
            value={formData.parentSignature}
            onChange={(file) => updateField('parentSignature', file)}
          />
          {errors.parentSignature ? <small className="error-text">{errors.parentSignature}</small> : null}
        </section>
      </div>
      <p className="upload-storage-note">Files are kept in this browser demo only; they are not uploaded to a server. Signature images are for preview and are not identity verification.</p>

      <div className="declaration-panel">
        <label className="checkbox-row">
          <input type="checkbox" checked={!!formData.declaration} onChange={(event) => updateField('declaration', event.target.checked)} />
          Student declaration <span className="required-indicator">*</span>
        </label>
        {errors.declaration ? <small className="error-text">{errors.declaration}</small> : null}
        <label className="checkbox-row">
          <input type="checkbox" checked={!!formData.parentDeclaration} onChange={(event) => updateField('parentDeclaration', event.target.checked)} />
          Parent declaration <span className="required-indicator">*</span>
        </label>
        {errors.parentDeclaration ? <small className="error-text">{errors.parentDeclaration}</small> : null}
      </div>
    </div>
  );

  const renderFeeStructureStep = () => {
    return (
      <section className="fee-structure-preview">
        <h3>College Fee Structure</h3>
        <div className="table-scroll">
          <table className="fee-table">
            <thead>
              <tr><th>Fee item</th><th>Amount (₹)</th><th>Frequency / details</th></tr>
            </thead>
            <tbody>
              <tr><td>Admission fees</td><td>5,000</td><td>One time</td></tr>
              <tr><td>Consortium fees</td><td>550</td><td>One time</td></tr>
              <tr><td>RRA amount (Anna University)</td><td>2,500</td><td>One time</td></tr>
              <tr><td>Sports fees (Anna University)</td><td>625</td><td>One time · Four years</td></tr>
              <tr><td>Group insurance</td><td>100</td><td>One time</td></tr>
              <tr><td>Syllabus fees (Anna University)</td><td>200</td><td>One time</td></tr>
              <tr><td>NSS fees (Anna University)</td><td>25</td><td>Frequency not specified</td></tr>
              <tr><td>Lab coat</td><td>500</td><td>Frequency not specified</td></tr>
              <tr><td>ID card</td><td>100</td><td>Frequency not specified</td></tr>
              <tr><td>Book fees &amp; exam paper fees</td><td>Not specified</td><td>Every semester</td></tr>
              <tr><td>Tuition fees — First Graduate (OC/BC/BC(M)/MBC &amp; DNC)</td><td>Not specified</td><td>Category-based</td></tr>
              <tr><td>Tuition fees — Non-First Graduate (OC/BC/BC(M)/MBC &amp; DNC)</td><td>Not specified</td><td>Category-based</td></tr>
              <tr><td>Tuition fees — SC/SC(A)/ST/SCC</td><td>Not specified</td><td>Category-based</td></tr>
              <tr><td>Hostel fees (OC/BC/BC(M)/MBC &amp; DNC)</td><td>Not specified</td><td>Category-based</td></tr>
              <tr><td>Hostel fees — SC/SC(A)/ST/SCC</td><td>Not specified</td><td>Category-based</td></tr>
              <tr><td>Hostel / transport application form</td><td>50</td><td>Frequency not specified</td></tr>
              <tr><td>Transport fees</td><td>Not specified</td><td>Per year</td></tr>
            </tbody>
          </table>
        </div>
        <p className="fee-structure-note">This page is for viewing only. Amounts not listed on the supplied fee sheet are marked “Not specified”; please confirm those amounts with the college office.</p>
      </section>
    );
  };

  const renderedSteps = [
    renderAdmissionCategoryStep,
    renderProgrammeStep,
    renderFirstGraduateStep,
    renderPersonalStep,
    renderParentsStep,
    renderAccommodationStep,
    renderEducationStep,
    renderDocumentsStep,
    renderFeeStructureStep,
  ];

  const goToPreview = () => {
    saveDraft({ ...formData, cutOffMarks: cutOffValue ?? '', workflowStep: currentStep, workflowVersion: 2 });
    navigate('/application-preview');
  };

  return (
    <main className="page-shell register-shell">
      <section className="content-panel form-panel">
        <div className="section-header space-between">
          <div>
              <p className="eyebrow accent">
                <span className="admissions-portal-label">Admissions Portal</span>
                <span className="completion-count">{completedStepCount}/9</span>
              </p>
            {currentStep !== 1 ? <h2>{steps[currentStep - 1]}</h2> : null}
          </div>
        </div>

        <div className="progress-bar" aria-label={`${completedStepCount} of 9 pages completed`}>
          <span style={{ width: `${(completedStepCount / steps.length) * 100}%` }} />
        </div>
        {currentStep !== 9 ? (
          <p className="required-fields-note"><span className="required-indicator">*</span> Required fields. EMIS ID, guardian details, and document uploads are optional; student and parent signatures are required.</p>
        ) : null}

        {renderedSteps[currentStep - 1]()}

        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={goPrevious}>
            <ArrowLeft size={16} /> Previous
          </button>
          {currentStep > 3 ? (
            <button type="button" className="secondary-btn" onClick={handleSaveDraft}>
              <Save size={16} /> Save Draft
            </button>
          ) : null}
          {currentStep < steps.length ? (
            <button type="button" className="primary-btn" onClick={goNext}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="primary-btn" onClick={goToPreview}>
              Next to Preview <ArrowRight size={16} />
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
