import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/api/lib/supabase.js', () => ({
  supabase: {},
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('../../../src/api/lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../../src/agent/lib/claude.js', () => ({
  generatePlan: vi.fn(),
}));

const { supabaseAdmin } = await import('../../../src/api/lib/supabase.js');
const { generatePlan } = await import('../../../src/agent/lib/claude.js');
const { handlePlan } = await import('../../../src/agent/stages/planner.js');

function mockChain(resolveValue) {
  return new Proxy(
    {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    },
    {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve(resolveValue);
        return target[prop];
      },
    },
  );
}

describe('handlePlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates a plan and stores it', async () => {
    const plan = {
      steps: [{ order: 1, description: 'Fix the route', type: 'code' }],
      files_affected: ['src/api/routes/auth.js'],
      acceptance_criteria: ['Login works'],
      risk_assessment: { level: 'low', categories: [], notes: 'Minor fix' },
      estimated_complexity: 'simple',
    };

    generatePlan.mockResolvedValue(plan);

    // Mock: existing plans query returns empty
    const plansSelectChain = mockChain({ data: [], error: null });
    // Mock: plans insert
    const plansInsertChain = mockChain({ data: null, error: null });

    let callCount = 0;
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'plans') {
        callCount++;
        if (callCount === 1) return plansSelectChain; // select existing plans
        return plansInsertChain; // insert new plan
      }
      return mockChain({ data: null, error: null });
    });

    const result = await handlePlan({
      case_id: 'c-1',
      org_id: 'org-1',
      title: 'Fix login',
      case_type: 'bug',
      risk_flags: [],
      metadata: {},
    });

    expect(result.advance).toBe(true);
    expect(result.error).toBeNull();
    expect(result.summary).toContain('Plan v1');
    expect(result.summary).toContain('1 steps');
    expect(generatePlan).toHaveBeenCalled();
  });

  it('returns error when plan generation fails', async () => {
    generatePlan.mockRejectedValue(new Error('Token limit exceeded'));

    const result = await handlePlan({
      case_id: 'c-1',
      org_id: 'org-1',
      title: 'Complex feature',
      case_type: 'enhancement',
      risk_flags: [],
      metadata: {},
    });

    expect(result.advance).toBe(false);
    expect(result.error).toContain('Plan generation failed');
    expect(result.error).toContain('Token limit exceeded');
  });
});
