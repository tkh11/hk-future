export const officeOrigin = 'http://mac-mini.local:3000';
export const officeCookiePrefix = 'hk-office';

export function isOfficeDevelopment() {
  return process.env.NODE_ENV === 'development' && process.env.CMS_SERVER_URL === officeOrigin
    && !!process.env.DATABASE_URL && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname);
}

export function cmsEnabled() {
  return process.env.CMS_ENABLED === 'true' && process.env.GITHUB_PAGES !== 'true';
}

export function cmsEnvironment() {
  const enabled = cmsEnabled();
  const secret = process.env.PAYLOAD_SECRET;
  const databaseURL = process.env.DATABASE_URL;
  const serverURL = process.env.CMS_SERVER_URL || 'http://localhost:3000';
  if (enabled && (!secret || secret.length < 32 || !databaseURL)) {
    throw new Error('CMS requires DATABASE_URL and PAYLOAD_SECRET (at least 32 characters).');
  }
  const url = new URL(serverURL);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (enabled && !local && !isOfficeDevelopment() && (url.protocol !== 'https:' || (process.env.CMS_GATEWAY_SECRET?.length || 0) < 32 || !process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !process.env.S3_ENDPOINT?.startsWith('https://'))) {
    throw new Error('External CMS requires HTTPS, a protected access gateway and private S3 storage.');
  }
  return {
    enabled, serverURL: url.origin, local,
    // Schema generation is available without service credentials. Disabled routes cannot use this key.
    secret: secret || 'disabled-cms-schema-generation-not-for-authentication',
    databaseURL: databaseURL || 'postgresql://localhost:5432/cms_disabled',
  };
}
