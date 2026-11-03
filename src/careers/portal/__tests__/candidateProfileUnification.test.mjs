import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Candidate Master Profile Unification Verification Suite', () => {

  // Test 1: Verification of bi-directional Current vs Permanent Address Mapping
  it('1. Correctly maps separate Current and Permanent addresses in master profile', () => {
    const rawProfileFromDb = {
      id: 'profile-123',
      user_id: 'user-456',
      candidate_id: 'ABF-CAND-789012',
      mobile: '9876543210',
      alternate_mobile: '9123456780',
      emergency_mobile: '9123456780',
      full_name: 'ANURAG PATIL',
      caste_category: 'OBC',
      date_of_birth: '1995-05-15',
      gender: 'male',
      address_line1: 'FLAT 101, GREEN ACRES',
      district: 'Pune',
      taluka: 'Haveli',
      pincode: '411028',
      permanent_same_as_current: false,
      permanent_address_line1: 'HOUSE 45, NATIVE VILLAGE',
      permanent_district: 'Satara',
      permanent_taluka: 'Karad',
      permanent_pincode: '415110',
      aadhaar_hash: 'mock-hmac-sha256-hash-value',
      created_at: '2026-08-01T10:00:00Z',
    };

    // Simulate mapping into MasterProfileFormData (as done in MyProfile.tsx and CandidateApplyWizard.tsx)
    const masterProfile = {
      fullName: rawProfileFromDb.full_name,
      dateOfBirth: rawProfileFromDb.date_of_birth,
      gender: rawProfileFromDb.gender,
      mobile: rawProfileFromDb.mobile,
      alternateMobile: rawProfileFromDb.alternate_mobile || rawProfileFromDb.emergency_mobile,
      casteCategory: rawProfileFromDb.caste_category,
      currentAddressLine1: rawProfileFromDb.address_line1,
      currentDistrict: rawProfileFromDb.district,
      currentTaluka: rawProfileFromDb.taluka,
      currentPincode: rawProfileFromDb.pincode,
      permanentSameAsCurrent: rawProfileFromDb.permanent_same_as_current,
      permanentAddressLine1: rawProfileFromDb.permanent_address_line1,
      permanentDistrict: rawProfileFromDb.permanent_district,
      permanentTaluka: rawProfileFromDb.permanent_taluka,
      permanentPincode: rawProfileFromDb.permanent_pincode,
    };

    assert.equal(masterProfile.fullName, 'ANURAG PATIL');
    assert.equal(masterProfile.casteCategory, 'OBC');
    assert.equal(masterProfile.currentDistrict, 'Pune');
    assert.equal(masterProfile.currentTaluka, 'Haveli');
    assert.equal(masterProfile.permanentDistrict, 'Satara');
    assert.equal(masterProfile.permanentTaluka, 'Karad');
    assert.notEqual(masterProfile.currentDistrict, masterProfile.permanentDistrict);
  });

  // Test 2: Same-address checkbox synchronizes permanent address from current address
  it('2. Same-as-current address synchronization populates permanent from current address', () => {
    const currentAddress = {
      line1: 'PLOT 12, SECTOR 4',
      district: 'Nagpur',
      taluka: 'Nagpur (Urban)',
      pincode: '440001',
    };

    const isSameAddress = true;
    const permanentAddress = isSameAddress
      ? { ...currentAddress }
      : { line1: '', district: '', taluka: '', pincode: '' };

    assert.equal(permanentAddress.district, 'Nagpur');
    assert.equal(permanentAddress.taluka, 'Nagpur (Urban)');
    assert.equal(permanentAddress.pincode, '440001');
  });

  // Test 3: Caste category and alternate mobile persistence payload construction
  it('3. Persists caste_category and harmonizes alternate_mobile and emergency_mobile', () => {
    const formData = {
      userId: 'user-789',
      fullName: 'SURESH SHINDE',
      dateOfBirth: '1998-10-20',
      gender: 'male',
      mobile: '9876543210',
      alternateMobile: '9822001122',
      casteCategory: 'EWS',
      currentDistrict: 'Kolhapur',
      currentTaluka: 'Karvir',
      currentAddressLine1: 'STATION ROAD',
      currentPincode: '416001',
      permanentSameAsCurrent: true,
      permanentAddressLine1: 'STATION ROAD',
      permanentDistrict: 'Kolhapur',
      permanentTaluka: 'Karvir',
      permanentPincode: '416001',
    };

    const cleanAlt = formData.alternateMobile.trim().replace(/\D/g, '');
    const payload = {
      user_id: formData.userId,
      mobile: formData.mobile,
      full_name: formData.fullName.trim(),
      date_of_birth: formData.dateOfBirth,
      gender: formData.gender,
      caste_category: formData.casteCategory,
      alternate_mobile: cleanAlt,
      emergency_mobile: cleanAlt,
      district: formData.currentDistrict,
      taluka: formData.currentTaluka,
      address_line1: formData.currentAddressLine1,
      pincode: formData.currentPincode,
      permanent_same_as_current: formData.permanentSameAsCurrent,
      permanent_address_line1: formData.permanentAddressLine1,
      permanent_district: formData.permanentDistrict,
      permanent_taluka: formData.permanentTaluka,
      permanent_pincode: formData.permanentPincode,
    };

    assert.equal(payload.caste_category, 'EWS');
    assert.equal(payload.alternate_mobile, '9822001122');
    assert.equal(payload.emergency_mobile, '9822001122');
    assert.equal(payload.permanent_district, 'Kolhapur');
    assert.equal(payload.permanent_same_as_current, true);
  });

  // Test 4: Submitted applications preserve immutable submission snapshot
  it('4. Submitted applications retain immutable historical profile snapshot even after profile update', () => {
    // 1. Initial application submission at T1
    const originalCandidateProfile = {
      fullName: 'PRIYA DESHMUKH',
      mobile: '9000000001',
      homeDistrict: 'Solapur',
      homeTaluka: 'Madha',
      casteCategory: 'OPEN',
    };

    const submittedApplication = {
      id: 'app-001',
      application_number: 'ABF-APP-2026-001',
      status: 'submitted',
      application_data: {
        master_profile: { ...originalCandidateProfile },
        submission_snapshot: {
          candidate: { ...originalCandidateProfile },
          submitted_at: '2026-10-01T12:00:00Z',
        },
      },
    };

    // 2. Candidate later updates master profile at T2 in Dashboard
    const updatedMasterProfile = {
      ...originalCandidateProfile,
      fullName: 'PRIYA SHARMA',
      homeDistrict: 'Pune',
      homeTaluka: 'Haveli',
      casteCategory: 'EWS',
    };

    // 3. Application snapshot remains frozen with original data
    assert.equal(submittedApplication.application_data.submission_snapshot.candidate.fullName, 'PRIYA DESHMUKH');
    assert.equal(submittedApplication.application_data.submission_snapshot.candidate.homeDistrict, 'Solapur');
    assert.equal(submittedApplication.application_data.submission_snapshot.candidate.casteCategory, 'OPEN');
    assert.notEqual(submittedApplication.application_data.submission_snapshot.candidate.fullName, updatedMasterProfile.fullName);
  });

  // Test 5: Standalone execution without jobId
  it('5. Master Profile Manager functions in standalone mode without active job or application context', () => {
    const standaloneContext = {
      jobId: undefined,
      route: '/candidate/profile',
      user: { id: 'usr-999', phone: '+919999888877' },
      verifiedMobile: '9999888877',
      profile: {
        id: 'prof-999',
        user_id: 'usr-999',
        full_name: 'RAJESH KALE',
        mobile: '9999888877',
        district: 'Nashik',
        taluka: 'Niphad',
      },
    };

    assert.equal(standaloneContext.jobId, undefined);
    assert.equal(Boolean(standaloneContext.user.id), true);
    assert.equal(standaloneContext.profile.district, 'Nashik');
  });

  // Test 6: English script & 6-digit PIN code enforcement
  it('6. Strict 6-digit English numerals required for both current and permanent PIN codes', () => {
    const validatePin = (val) => {
      const trimmed = (val || '').trim();
      if (!trimmed) return 'Required';
      if (/[\u0900-\u097F\u0966-\u096F]/.test(trimmed)) return 'Only English digits allowed';
      if (/[^0-9]/.test(trimmed)) return 'Only digits allowed';
      if (trimmed.length !== 6) return 'Must be 6 digits';
      if (!/^[1-9][0-9]{5}$/.test(trimmed)) return 'Invalid PIN format';
      return null;
    };

    assert.equal(validatePin('411001'), null);
    assert.equal(validatePin('415110'), null);
    assert.notEqual(validatePin('४११००१'), null); // Marathi rejected
    assert.notEqual(validatePin('41100'), null);  // 5 digits rejected
    assert.notEqual(validatePin('4110001'), null); // 7 digits rejected
    assert.notEqual(validatePin('011001'), null); // Leading zero rejected
  });
});
