/**
 * Minimal GitHub Gist API client. The user's training log is stored as a
 * single JSON file inside one private gist on their own account.
 */

const API = 'https://api.github.com';
export const SYNC_FILE_NAME = 'pl-tracker-data.json';
export const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=PL%20Tracker%20Sync';

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function request(token: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(token), ...init?.headers } });
  if (res.status === 401) throw new Error('Token was rejected — check it was copied fully.');
  if (res.status === 403) throw new Error('GitHub refused the request (token may lack the gist permission).');
  return res;
}

export async function validateToken(token: string): Promise<string> {
  const res = await request(token, '/user');
  if (!res.ok) throw new Error(`Could not verify token (HTTP ${res.status}).`);
  const user = (await res.json()) as { login: string };
  return user.login;
}

/** Look for an existing sync gist on this account. */
export async function findExistingGist(token: string): Promise<string | null> {
  const res = await request(token, '/gists?per_page=100');
  if (!res.ok) throw new Error(`Could not list gists (HTTP ${res.status}).`);
  const gists = (await res.json()) as Array<{ id: string; files: Record<string, unknown> }>;
  return gists.find((g) => g.files && SYNC_FILE_NAME in g.files)?.id ?? null;
}

export async function createGist(token: string, content: string): Promise<string> {
  const res = await request(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Powerlifting Tracker sync data (private)',
      public: false,
      files: { [SYNC_FILE_NAME]: { content } }
    })
  });
  if (!res.ok) throw new Error(`Could not create the sync gist (HTTP ${res.status}).`);
  const gist = (await res.json()) as { id: string };
  return gist.id;
}

/** Returns the file content, or null if the gist/file is missing. */
export async function readGist(token: string, gistId: string): Promise<string | null> {
  const res = await request(token, `/gists/${gistId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not read sync data (HTTP ${res.status}).`);
  const gist = (await res.json()) as {
    files: Record<string, { content: string; truncated: boolean; raw_url: string } | undefined>;
  };
  const file = gist.files[SYNC_FILE_NAME];
  if (!file) return null;
  if (!file.truncated) return file.content;
  const raw = await fetch(file.raw_url);
  if (!raw.ok) throw new Error('Could not download sync data.');
  return raw.text();
}

export async function writeGist(token: string, gistId: string, content: string): Promise<void> {
  const res = await request(token, `/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [SYNC_FILE_NAME]: { content } } })
  });
  if (!res.ok) throw new Error(`Could not save sync data (HTTP ${res.status}).`);
}
