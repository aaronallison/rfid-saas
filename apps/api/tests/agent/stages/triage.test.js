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
  classifyCase: vi.fn(),
}));

const { supabaseAdmin } = await import('../../../src/api/lib/supabase.js');
const { classifyCase } = await import('../../../src/agent/lib/claude.js');
const { handleTriage } = await import('../../../src/agent/stages/triage.js');

function mockChain(resolveValue) {
  return new Proxy(
    {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    },
    {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve(resolveValue);
        return target[prop];
      },
    },
  );
}

describe('handleTriage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('classifies case and advances', async () => {
    classifyCase.mockResolvedValue({
      area: 'api',
      severity: 'high',
      risk_flags: ['auth'],
      reproducibility: 'always',
      notes: 'Auth-related bug',
    });

    supabaseAdmin.from.mockImplementation(() => mockChain({ data: null, error: null }));

    const result = await handleTriage({
      case_id: 'c-1',
      org_id: 'org-1',
      title: 'Login broken',
      case_type: 'bug',
      metadata: {},
    });

    expect(result.advance).toBe(true);
    expect(result.error).toBeNull();
    expect(result.summary).toContain('high');
    expect(result.summary).toContain('api');
    expect(classifyCase).toHaveBeenCalled();
    expect(supabaseAdmin.from).toHaveBeenCalledWith('cases');
  });

  it('returns error when Claude classification fails', async () => {
    classifyCase.mockRejectedValue(new Error('API rate limit'));

    const result = await handleTriage({
      case_id: 'c-1',
      org_id: 'org-1',
      title: 'Some bug',
      case_type: 'bug',
      metadata: {},
    });

    expect(result.advance).toBe(false);
    expect(result.error).toContain('Triage failed');
    expect(result.error).toContain('API rate limit');
  });
});
