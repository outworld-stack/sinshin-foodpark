import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL تنظیم نشده است — در کانتینر از env_file تامین می‌شود')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: { url },
})