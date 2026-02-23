import { describe, it, expect } from 'vitest';
import { handleIntake } from '../../../src/agent/stages/intake.js';

describe('handleIntake', () => {
  it('advances when title and case_type are present', async () => {
    const result = await handleIntake({
      case_id: 'c-1',
      org_id: 'org-1',
      title: 'Fix login bug',
      case_type: 'bug',
    });

    expect(result.advance).toBe(true);
    expect(result.needsHuman).toBe(false);
    expect(result.error).toBeNull();
    expect(result.summary).toContain('Fix login bug');
  });

  it('returns error when title is missing', async () => {
    const result = await handleIntake({
      case_id: 'c-1',
      org_id: 'org-1',
      title: '',
      case_type: 'bug',
    });

    expect(result.advance).toBe(false);
    expect(result.error).toContain('title');
  });

  it('returns error when case_type is missing', async () => {
    const result = await handleIntake({
      case_id: 'c-1',
      org_id: 'org-1',
      title: 'Some bug',
      case_type: '',
    });

    expect(result.advance).toBe(false);
    expect(result.error).toContain('case_type');
  });
});
