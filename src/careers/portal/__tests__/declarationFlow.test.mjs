import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure simulation of the Job Details declaration modal and application progression state machine.
 * This mirrors the implementation in src/careers/pages/JobDetail.tsx.
 */
function createJobDetailFlowState({
  jobId = 'job-123',
  isClosed = false,
  user = null,
  verifiedMobile = null,
  isDummyOtpMode = false,
  existingApp = null,
  initialAcknowledged = false,
} = {}) {
  let acknowledged = initialAcknowledged;
  let showDialog = false;
  let otpOpen = false;
  let navigatedTo = null;
  let isSubmittingDeclaration = false;
  let executionCount = 0;

  const navigate = (path) => {
    navigatedTo = path;
  };

  const setOtpOpen = (val) => {
    otpOpen = val;
  };

  const setShowDialog = (val) => {
    showDialog = val;
  };

  const setAcknowledged = (val) => {
    acknowledged = val;
  };

  const proceedToApplication = () => {
    if (!jobId) return;
    if (existingApp && !existingApp.is_trashed) {
      if (['interview_slot_pending', 'interview_scheduled'].includes(existingApp.status)) {
        navigate('/candidate/interviews');
      } else {
        navigate('/candidate/applications');
      }
      return;
    }
    if (isClosed) return;

    if (user?.id || (isDummyOtpMode && verifiedMobile)) {
      navigate(`/careers/portal/apply/${jobId}`);
      return;
    }

    setOtpOpen(true);
  };

  const handleApply = () => {
    if (existingApp && !existingApp.is_trashed) {
      if (['interview_slot_pending', 'interview_scheduled'].includes(existingApp.status)) {
        navigate('/candidate/interviews');
      } else {
        navigate('/candidate/applications');
      }
      return;
    }
    if (isClosed) return;
    if (!acknowledged) {
      setShowDialog(true);
      return;
    }

    proceedToApplication();
  };

  const handleAcceptDeclaration = () => {
    if (isSubmittingDeclaration) return;
    isSubmittingDeclaration = true;
    executionCount += 1;
    setAcknowledged(true);
    setShowDialog(false);
    proceedToApplication();
  };

  return {
    getAcknowledged: () => acknowledged,
    getShowDialog: () => showDialog,
    getOtpOpen: () => otpOpen,
    getNavigatedTo: () => navigatedTo,
    getExecutionCount: () => executionCount,
    getIsSubmittingDeclaration: () => isSubmittingDeclaration,
    handleApply,
    handleAcceptDeclaration,
  };
}

describe('Job Details Declaration Modal & Single-Click Application Flow', () => {

  it('1. Opens declaration modal when Apply Now is clicked without prior acknowledgement', () => {
    const flow = createJobDetailFlowState({ initialAcknowledged: false });
    flow.handleApply();
    assert.strictEqual(flow.getShowDialog(), true, 'Declaration dialog must open');
    assert.strictEqual(flow.getOtpOpen(), false, 'OTP modal should not open before declaration');
    assert.strictEqual(flow.getNavigatedTo(), null, 'No navigation should occur before declaration');
  });

  it('2. Authenticated candidate proceeds to portal apply on SINGLE click of Accept & Continue', () => {
    const flow = createJobDetailFlowState({
      jobId: 'feb0f61f-4361-4c54-a8af-3b3e531ba809',
      user: { id: 'usr-123' },
      initialAcknowledged: false,
    });

    // Step A: Candidate clicks Apply Now
    flow.handleApply();
    assert.strictEqual(flow.getShowDialog(), true, 'Modal opens');

    // Step B: Candidate clicks "Accept & Continue" ONCE
    flow.handleAcceptDeclaration();

    assert.strictEqual(flow.getShowDialog(), false, 'Modal closes immediately');
    assert.strictEqual(flow.getAcknowledged(), true, 'Declaration is recorded as acknowledged');
    assert.strictEqual(
      flow.getNavigatedTo(),
      '/careers/portal/apply/feb0f61f-4361-4c54-a8af-3b3e531ba809',
      'Must navigate directly to Candidate Portal on FIRST click without requiring a 2nd click'
    );
    assert.strictEqual(flow.getOtpOpen(), false, 'OTP modal not needed for authenticated candidate');
  });

  it('3. Unauthenticated candidate triggers WhatsApp OTP login modal on SINGLE click of Accept & Continue', () => {
    const flow = createJobDetailFlowState({
      jobId: 'feb0f61f-4361-4c54-a8af-3b3e531ba809',
      user: null,
      verifiedMobile: null,
      initialAcknowledged: false,
    });

    // Step A: Candidate clicks Apply Now
    flow.handleApply();
    assert.strictEqual(flow.getShowDialog(), true, 'Modal opens');

    // Step B: Candidate clicks "Accept & Continue" ONCE
    flow.handleAcceptDeclaration();

    assert.strictEqual(flow.getShowDialog(), false, 'Modal closes');
    assert.strictEqual(flow.getAcknowledged(), true, 'Declaration is recorded as acknowledged');
    assert.strictEqual(flow.getOtpOpen(), true, 'Must open WhatsApp OTP modal immediately on FIRST click');
    assert.strictEqual(flow.getNavigatedTo(), null, 'Navigation deferred until OTP completion');
  });

  it('4. Local dummy OTP mode candidate proceeds to portal apply on SINGLE click', () => {
    const flow = createJobDetailFlowState({
      jobId: 'feb0f61f-4361-4c54-a8af-3b3e531ba809',
      user: null,
      isDummyOtpMode: true,
      verifiedMobile: '9876543210',
      initialAcknowledged: false,
    });

    flow.handleApply();
    assert.strictEqual(flow.getShowDialog(), true);

    flow.handleAcceptDeclaration();
    assert.strictEqual(flow.getShowDialog(), false);
    assert.strictEqual(
      flow.getNavigatedTo(),
      '/careers/portal/apply/feb0f61f-4361-4c54-a8af-3b3e531ba809',
      'Dummy OTP verified candidate navigates directly to portal wizard'
    );
  });

  it('5. Pre-acknowledged candidate bypasses modal and proceeds immediately', () => {
    const flow = createJobDetailFlowState({
      jobId: 'feb0f61f-4361-4c54-a8af-3b3e531ba809',
      user: { id: 'usr-456' },
      initialAcknowledged: true, // checked the box in the sidebar beforehand
    });

    flow.handleApply();
    assert.strictEqual(flow.getShowDialog(), false, 'Modal should not open if already acknowledged');
    assert.strictEqual(
      flow.getNavigatedTo(),
      '/careers/portal/apply/feb0f61f-4361-4c54-a8af-3b3e531ba809'
    );
  });

  it('6. Candidate with existing application is redirected to existing status views', () => {
    const interviewFlow = createJobDetailFlowState({
      existingApp: { id: 'app-1', status: 'interview_scheduled', is_trashed: false },
      initialAcknowledged: false,
    });
    interviewFlow.handleApply();
    assert.strictEqual(interviewFlow.getNavigatedTo(), '/candidate/interviews');
    assert.strictEqual(interviewFlow.getShowDialog(), false);

    const appFlow = createJobDetailFlowState({
      existingApp: { id: 'app-2', status: 'submitted', is_trashed: false },
      initialAcknowledged: false,
    });
    appFlow.handleApply();
    assert.strictEqual(appFlow.getNavigatedTo(), '/candidate/applications');
    assert.strictEqual(appFlow.getShowDialog(), false);
  });

  it('7. Closed job does not proceed to modal, auth, or application', () => {
    const flow = createJobDetailFlowState({
      isClosed: true,
      initialAcknowledged: false,
    });
    flow.handleApply();
    assert.strictEqual(flow.getShowDialog(), false);
    assert.strictEqual(flow.getOtpOpen(), false);
    assert.strictEqual(flow.getNavigatedTo(), null);
  });

  it('8. Rapid duplicate clicks on Accept & Continue are guarded', () => {
    const flow = createJobDetailFlowState({
      user: { id: 'usr-123' },
      initialAcknowledged: false,
    });
    flow.handleApply();

    // First click
    flow.handleAcceptDeclaration();
    assert.strictEqual(flow.getExecutionCount(), 1);

    // Second accidental rapid click
    flow.handleAcceptDeclaration();
    assert.strictEqual(flow.getExecutionCount(), 1, 'Duplicate click must be prevented while processing');
  });

});
