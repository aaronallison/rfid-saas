/* ================================================================
   GroTap — GitHub (Octokit) wrapper — STUBBED for MVP
   Will be implemented when executor stage is built out.
   ================================================================ */

import { Octokit } from '@octokit/rest';
import logger from '../../api/lib/logger.js';

let octokit = null;

function getOctokit() {
  if (octokit) return octokit;
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  octokit = new Octokit({ auth: token });
  return octokit;
}

function parseRepoUrl() {
  const url = process.env.GITHUB_REPO_URL || '';
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GITHUB_REPO_URL');
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

/** Stub: create a branch. Returns mock ref. */
export async function createBranch(branchName, baseBranch = 'develop') {
  logger.info({ branchName, baseBranch }, 'GitHub.createBranch (stub)');
  return { ref: `refs/heads/${branchName}` };
}

/** Stub: create a PR. Returns mock URL. */
export async function createPR(title, body, branchName, baseBranch = 'develop') {
  logger.info({ title, branchName, baseBranch }, 'GitHub.createPR (stub)');
  return { html_url: `https://github.com/stub/repo/pull/0` };
}

export { getOctokit, parseRepoUrl };
