import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { s3Storage } from '@payloadcms/storage-s3';
import { ru } from '@payloadcms/translations/languages/ru';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmsEnvironment } from './src/cms/env';
import { collections, globals } from './src/cms/collections';
import { disabledEmailAdapter } from './src/cms/email';
import { configurePrivateLockOwners } from './src/cms/lock-privacy';

const root = path.dirname(fileURLToPath(import.meta.url));
const env = cmsEnvironment();
export default buildConfig({
  secret: env.secret, serverURL: env.serverURL,
  email: disabledEmailAdapter,
  onInit: configurePrivateLockOwners,
  admin: { user: 'users', theme: 'dark', importMap: { baseDir: root },
    meta: { titleSuffix: ' — HEISSKRAFT', icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/brand/whiteICON.svg' }] },
    components: {
    Nav: '@/cms/components/AdminNav#default',
    graphics: { Logo: '@/cms/components/AdminBrand#AdminLogo', Icon: '@/cms/components/AdminBrand#AdminIcon' },
    views: {
      dashboard: { Component: '@/cms/components/AdminDashboard#default' },
      catalogImport: { Component: '@/cms/components/CatalogImportView#default', path: '/import', meta: { title: 'Импорт каталога' } },
    },
  } },
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
});
