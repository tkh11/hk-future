import { buildConfig, type Config } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { s3Storage } from '@payloadcms/storage-s3';
import { ru } from '@payloadcms/translations/languages/ru';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmsEnvironment, isOfficeDevelopment, officeCookiePrefix } from './src/cms/env';
import { collections, globals } from './src/cms/collections';
import { disabledEmailAdapter } from './src/cms/email';
import { configurePrivateLockOwners } from './src/cms/lock-privacy';

const root = path.dirname(fileURLToPath(import.meta.url));
const env = cmsEnvironment();
export const payloadConfig: Config = {
  secret: env.secret, serverURL: env.serverURL,
  ...(isOfficeDevelopment() && { cookiePrefix: officeCookiePrefix }),
  email: disabledEmailAdapter,
  onInit: configurePrivateLockOwners,
  admin: { user: 'users' },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru', translations: { ru: { general: { searchBy: 'Поиск: {{label}}', or: 'или' } } } },
  csrf: [env.serverURL], cors: [env.serverURL],
  graphQL: { disable: true },
  upload: { limits: { fileSize: 256 * 1024 * 1024 }, abortOnLimit: true },
  db: postgresAdapter({ pool: { connectionString: env.databaseURL, max: 10 }, push: false, migrationDir: path.join(root, 'src/cms/migrations') }),
  sharp, collections, globals,
  typescript: { outputFile: path.join(root, 'src/cms/payload-types.ts') },
  plugins: [s3Storage({ enabled: !!process.env.S3_BUCKET, alwaysInsertFields: true,
    bucket: process.env.S3_BUCKET || 'disabled', acl: 'private', signedDownloads: false,
    collections: { media: { prefix: process.env.S3_PREFIX || 'heisskraft' } },
    config: { endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || 'ru-1', forcePathStyle: true,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' } },
  })],
};

export default buildConfig(payloadConfig);
