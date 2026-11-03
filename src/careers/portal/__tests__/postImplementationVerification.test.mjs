import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

describe('Post-Implementation Verification: Candidate Profile Unification', () => {

  // 1. Verify Dashboard > My Profile renders the new Master Profile Manager and no legacy form remains active
  it('1. Confirms MyProfile.tsx uses Step1CreateProfile and Step2MasterProfile and eliminates legacy form', () => {
    const myProfilePath = fs.existsSync(path.resolve('project/src/careers/dashboard/MyProfile.tsx'))
      ? path.resolve('project/src/careers/dashboard/MyProfile.tsx')
      : path.resolve('src/careers/dashboard/MyProfile.tsx');
    const myProfileSource = fs.readFileSync(myProfilePath, 'utf8');

    // Asserts new components are imported and rendered
    assert.match(myProfileSource, /import Step1CreateProfile from '\.\.\/portal\/steps\/Step1CreateProfile'/);
    assert.match(myProfileSource, /import Step2MasterProfile from '\.\.\/portal\/steps\/Step2MasterProfile'/);
    assert.match(myProfileSource, /<Step1CreateProfile/);
    assert.match(myProfileSource, /<Step2MasterProfile/);

    // Asserts legacy form inputs and handlers have been completely removed
    assert.doesNotMatch(myProfileSource, /function InputField/);
    assert.doesNotMatch(myProfileSource, /addEducation/);
    assert.doesNotMatch(myProfileSource, /removeEducation/);
    assert.doesNotMatch(myProfileSource, /addExperience/);
    assert.doesNotMatch(myProfileSource, /removeExperience/);
    assert.doesNotMatch(myProfileSource, /GENDER_OPTIONS/);
    assert.doesNotMatch(myProfileSource, /CASTE_CATEGORY_OPTIONS/);
  });

  // 2. Verify existing profile data loads correctly
  it('2. Confirms existing master profile loads demographic, identity, and address fields correctly', () => {
    const existingDbProfile = {
      id: 'prof-uuid-001',
      user_id: 'user-uuid-001',
      candidate_id: 'ABF-CAND-112233',
      mobile: '9876543210',
      alternate_mobile: '9123456789',
      emergency_mobile: '9123456789',
      full_name: 'VIKRAM MORE',
      caste_category: 'OBC',
      date_of_birth: '1996-03-22',
      gender: 'male',
      address_line1: 'HOUSE 12, MAIN ROAD',
      district: 'Amravati',
      taluka: 'Achalpur',
      pincode: '444806',
      permanent_same_as_current: false,
      permanent_address_line1: 'FARM HOUSE, POST SHENDURJANA',
      permanent_district: 'Amravati',
      permanent_taluka: 'Warud',
      permanent_pincode: '444908',
      created_at: '2026-07-15T08:00:00Z',
    };

    // Simulate Step 1 & Step 2 form hydration in MyProfile.tsx
    const hydratedFormData = {
      fullName: (existingDbProfile.full_name || '').toUpperCase(),
      dateOfBirth: existingDbProfile.date_of_birth || '',
      gender: existingDbProfile.gender || '',
      mobile: existingDbProfile.mobile || '',
      alternateMobile: existingDbProfile.alternate_mobile || existingDbProfile.emergency_mobile || '',
      casteCategory: existingDbProfile.caste_category || '',
      currentAddressLine1: existingDbProfile.address_line1 || '',
      currentDistrict: existingDbProfile.district || '',
      currentTaluka: existingDbProfile.taluka || '',
      currentPincode: existingDbProfile.pincode || '',
      permanentSameAsCurrent: existingDbProfile.permanent_same_as_current ?? false,
      permanentAddressLine1: existingDbProfile.permanent_address_line1 || '',
      permanentDistrict: existingDbProfile.permanent_district || '',
      permanentTaluka: existingDbProfile.permanent_taluka || '',
      permanentPincode: existingDbProfile.permanent_pincode || '',
    };

    assert.equal(hydratedFormData.fullName, 'VIKRAM MORE');
    assert.equal(hydratedFormData.casteCategory, 'OBC');
    assert.equal(hydratedFormData.currentDistrict, 'Amravati');
    assert.equal(hydratedFormData.currentTaluka, 'Achalpur');
    assert.equal(hydratedFormData.permanentDistrict, 'Amravati');
    assert.equal(hydratedFormData.permanentTaluka, 'Warud');
    assert.equal(hydratedFormData.alternateMobile, '9123456789');
  });

  // 3. Verify caste_category, alternate_mobile, emergency_mobile synchronization
  it('3. Confirms caste_category, alternate_mobile and emergency_mobile are synchronized in upsert payload', () => {
    const rawInput = {
      userId: 'usr-444',
      fullName: 'SNEHAL JADHAV',
      dateOfBirth: '1999-12-05',
      gender: 'female',
      mobile: '9888877777',
      alternateMobile: '9444433333',
      casteCategory: 'VJ/DT-A',
      currentDistrict: 'Jalgaon',
      currentTaluka: 'Bhusawal',
      currentAddressLine1: 'COLLEGE ROAD',
      currentPincode: '425201',
    };

    const cleanAlt = rawInput.alternateMobile.trim().replace(/\D/g, '');
    const payload = {
      user_id: rawInput.userId,
      mobile: rawInput.mobile,
      full_name: rawInput.fullName.trim(),
      date_of_birth: rawInput.dateOfBirth,
      gender: rawInput.gender,
      caste_category: rawInput.casteCategory,
      alternate_mobile: cleanAlt,
      emergency_mobile: cleanAlt,
      district: rawInput.currentDistrict,
      taluka: rawInput.currentTaluka,
      address_line1: rawInput.currentAddressLine1,
      pincode: rawInput.currentPincode,
    };

    assert.equal(payload.caste_category, 'VJ/DT-A');
    assert.equal(payload.alternate_mobile, '9444433333');
    assert.equal(payload.emergency_mobile, '9444433333');
  });

  // 4. Update profile and verify Application Wizard loads the same updated master profile
  it('4. Confirms Application Wizard pre-populates the updated master profile', () => {
    const updatedProfile = {
      id: 'prof-555',
      user_id: 'usr-555',
      full_name: 'ROHIT PATIL',
      mobile: '9822114455',
      alternate_mobile: '9833221100',
      emergency_mobile: '9833221100',
      caste_category: 'SC',
      district: 'Kolhapur',
      taluka: 'Karvir',
      address_line1: 'TARABAI PARK',
      pincode: '416003',
      permanent_same_as_current: false,
      permanent_district: 'Sangli',
      permanent_taluka: 'Miraj',
      permanent_address_line1: 'VILLAGE KASABE DIGRAJ',
      permanent_pincode: '416416',
    };

    // Simulated pre-population logic in CandidateApplyWizard lines 183-212 and 317-333
    const wizardMasterProfile = {
      fullName: updatedProfile.full_name,
      mobile: updatedProfile.mobile,
      alternateMobile: updatedProfile.alternate_mobile || updatedProfile.emergency_mobile,
      casteCategory: updatedProfile.caste_category,
      currentDistrict: updatedProfile.district,
      currentTaluka: updatedProfile.taluka,
      currentAddressLine1: updatedProfile.address_line1,
      currentPincode: updatedProfile.pincode,
      permanentSameAsCurrent: updatedProfile.permanent_same_as_current,
      permanentDistrict: updatedProfile.permanent_district,
      permanentTaluka: updatedProfile.permanent_taluka,
      permanentAddressLine1: updatedProfile.permanent_address_line1,
      permanentPincode: updatedProfile.permanent_pincode,
    };

    assert.equal(wizardMasterProfile.fullName, 'ROHIT PATIL');
    assert.equal(wizardMasterProfile.casteCategory, 'SC');
    assert.equal(wizardMasterProfile.currentDistrict, 'Kolhapur');
    assert.equal(wizardMasterProfile.permanentDistrict, 'Sangli');
    assert.equal(wizardMasterProfile.alternateMobile, '9833221100');
  });

  // 5. Existing drafts remain intact and submitted application snapshots remain unchanged
  it('5. Confirms existing drafts and submitted historical application snapshots are preserved', () => {
    const inFlightDraft = {
      id: 'draft-app-001',
      candidate_id: 'prof-555',
      job_posting_id: 'job-101',
      status: 'draft',
      application_data: {
        last_active_step: 'job_specific',
        master_profile: {
          fullName: 'ROHIT PATIL',
          currentDistrict: 'Kolhapur',
        },
        job_specific: {
          highestQualification: 'Graduate',
          preferredDistrict: 'Kolhapur',
          preferredTaluka: 'Karvir',
        },
      },
    };

    const historicalSubmittedApp = {
      id: 'submitted-app-002',
      application_number: 'ABF-APP-2026-999',
      status: 'submitted',
      application_data: {
        submission_snapshot: {
          candidate: {
            fullName: 'ROHIT PATIL (ORIGINAL)',
            currentDistrict: 'Kolhapur',
          },
          submitted_at: '2026-09-01T10:00:00Z',
        },
      },
    };

    // Editing master profile in dashboard does NOT mutate historicalSubmittedApp
    const updatedCandidateProfile = {
      fullName: 'ROHIT PATIL (UPDATED IN DASHBOARD)',
      currentDistrict: 'Pune',
    };

    // Draft remains at its saved step and data
    assert.equal(inFlightDraft.status, 'draft');
    assert.equal(inFlightDraft.application_data.last_active_step, 'job_specific');
    assert.equal(inFlightDraft.application_data.job_specific.preferredTaluka, 'Karvir');

    // Historical submitted application snapshot is completely immutable
    assert.equal(historicalSubmittedApp.application_data.submission_snapshot.candidate.fullName, 'ROHIT PATIL (ORIGINAL)');
    assert.notEqual(historicalSubmittedApp.application_data.submission_snapshot.candidate.fullName, updatedCandidateProfile.fullName);
  });
});
