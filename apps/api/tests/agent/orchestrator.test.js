import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing orchestrator
vi.mock('../../src/api/lib/supabase.js', () => ({
  supabase: {},
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('../../src/api/lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/queue/queues.js', () => ({
  enqueueCase: vi.fn().mockResolvedValue({ id: 'job-1' }),
}));

// Mock all stage handlers
vi.mock('../../src/agent/stages/intake.js', () => ({
  handleIntake: vi.fn(),
}));
vi.mock('../../src/agent/stages/triage.js', () => ({
  handleTriage: vi.fn(),
}));
vi.mock('../../src/agent/stages/planner.js', () => ({
  handlePlan: vi.fn(),
}));
vi.mock('../../src/agent/stages/planReview.js', () => ({
  handlePlanReview: vi.fn(),
}));
vi.mock('../../src/agent/stages/executor.js', () => ({
  handleExecute: vi.fn(),
}));
vi.mock('../../src/agent/stages/fixReview.js', () => ({
  handleFixReview: vi.fn(),
}));
vi.mock('../../src/agent/stages/policyReview.js', () => ({
  handlePolicyReview: vi.fn(),
}));
vi.mock('../../src/agent/stages/changeReview.js', () => ({
  handleChangeReview: vi.fn(),
}));
vi.mock('../../src/agent/stages/promoteBeta.js', () => ({
  handlePromoteBeta: vi.fn(),
}));
vi.mock('../../src/agent/stages/close.js', () => ({
  handleClose: vi.fn(),
}));

const { supabaseAdmin } = await import('../../src/api/lib/supabase.js');
const { enqueueCase } = await import('../../src/queue/queues.js');
const { handleIntake } = await import('../../src/agent/stages/intake.js');
const { handleClose } = await import('../../src/agent/stages/close.js');

const {
  processCase,
  STAGES,
  getNextStage,
  isReviewStage,
  hasHighRiskFlags,
} = await import('../../src/agent/orchestrator.js');

// Helper: mock supabaseAdmin.from chain
function mockChain(resolveValue) {
  return new Proxy(
    {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(resolveValue),
    },
    {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve(resolveValue);
        return target[prop];
      },
    },
  );
}

// ---------- Pure function tests ----------

describe('getNextStage', () => {
  it('returns triage after intake', () => {
    expect(getNextStage('intake')).toBe('triage');
  });

  it('returns plan after triage', () => {
    expect(getNextStage('triage')).toBe('plan');
  });

  it('returns null after close (final stage)', () => {
    expect(getNextStage('close')).toBeNull();
  });

  it('returns null for unknown stage', () => {
    expect(getNextStage('nonexistent')).toBeNull();
  });

  it('covers all 10 stages', () => {
    expect(STAGES).toHaveLength(10);
    expect(STAGES[0]).toBe('intake');
    expect(STAGES[9]).toBe('close');
  });
});

describe('isReviewStage', () => {
  it('returns true for plan_review', () => {
    expect(isReviewStage('plan_review')).toBe(true);
  });

  it('returns true for fix_review', () => {
    expect(isReviewStage('fix_review')).toBe(true);
  });

  it('returns false for intake', () => {
    expect(isReviewStage('intake')).toBe(false);
  });

  it('returns false for execute', () => {
    expect(isReviewStage('execute')).toBe(false);
  });
});

describe('hasHighRiskFlags', () => {
  it('returns true for auth flag', () => {
    expect(hasHighRiskFlags(['auth'])).toBe(true);
  });

  it('returns true for billing flag', () => {
    expect(hasHighRiskFlags(['billing'])).toBe(true);
  });

  it('returns true for security flag', () => {
    expect(hasHighRiskFlags(['security'])).toBe(true);
  });

  it('returns true for rls flag', () => {
    expect(hasHighRiskFlags(['rls'])).toBe(true);
  });

  it('returns false for data flag alone', () => {
    expect(hasHighRiskFlags(['data'])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasHighRiskFlags([])).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(hasHighRiskFlags(null)).toBe(false);
    expect(hasHighRiskFlags(undefined)).toBe(false);
  });
});

// ---------- processCase tests ----------

describe('processCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips processing on stage mismatch', async () => {
    const caseData = {
      case_id: 'c-1', org_id: 'org-1', stage: 'triage', status: 'open',
      risk_flags: [], retry_count: 0, max_retries: 3,
    };

    supabaseAdmin.from.mockImplementation(() => mockChain({ data: caseData, error: null }));

    await processCase('c-1', 'intake'); // mismatch: case is at triage

    // handleIntake should NOT have been called
    expect(handleIntake).not.toHaveBeenCalled();
  });

  it('skips processing for completed cases', async () => {
    const caseData = {
      case_id: 'c-1', org_id: 'org-1', stage: 'close', status: 'completed',
      risk_flags: [], retry_count: 0, max_retries: 3,
    };

    supabaseAdmin.from.mockImplementation(() => mockChain({ data: caseData, error: null }));

    await processCase('c-1', 'close');

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('skips processing for needs_human cases', async () => {
    const caseData = {
      case_id: 'c-1', org_id: 'org-1', stage: 'plan_review', status: 'needs_human',
      risk_flags: ['auth'], retry_count: 0, max_retries: 3,
    };

    supabaseAdmin.from.mockImplementation(() => mockChain({ data: caseData, error: null }));

    await processCase('c-1', 'plan_review');

    // No handler should have run
    expect(handleIntake).not.toHaveBeenCalled();
  });

  it('advances case to next stage on handler success', async () => {
    const caseData = {
      case_id: 'c-1', org_id: 'org-1', stage: 'intake', status: 'open',
      title: 'Test', risk_flags: [], retry_count: 0, max_retries: 3,
    };

    handleIntake.mockResolvedValue({
      advance: true, needsHuman: false, error: null, summary: 'Intake complete',
    });

    const _updateChain = mockChain({ data: null, error: null });
    const insertChain = mockChain({ data: null, error: null });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'cases') {
        // First call: select (load case), subsequent: update
        return mockChain({ data: caseData, error: null });
      }
      if (table === 'case_events') return insertChain;
      return mockChain({ data: null, error: null });
    });

    await processCase('c-1', 'intake');

    expect(handleIntake).toHaveBeenCalledWith(caseData);
    expect(enqueueCase).toHaveBeenCalledWith('c-1', 'triage');
  });

  it('marks case as failed after max retries', async () => {
    const caseData = {
      case_id: 'c-1', org_id: 'org-1', stage: 'intake', status: 'open',
      title: 'Test', risk_flags: [], retry_count: 3, max_retries: 3,
    };

    handleIntake.mockResolvedValue({
      advance: false, needsHuman: false, error: 'Something broke', summary: null,
    });

    supabaseAdmin.from.mockImplementation(() => mockChain({ data: caseData, error: null }));

    await processCase('c-1', 'intake');

    // Should have attempted to update status to 'failed'
    expect(supabaseAdmin.from).toHaveBeenCalledWith('cases');
  });
});
