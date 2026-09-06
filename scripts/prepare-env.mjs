import fs from 'fs';
import path from 'path';

// Support Vercel Postgres / Neon default injected variable names
const dbUrl = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL || 
  process.env.NEON_DATABASE_URL;

if (dbUrl) {
  process.env.DATABASE_URL = dbUrl;
  console.log('[ENV] Database URL detected successfully.');

  // Append or write to .env so Prisma CLI can access it
  const envPath = path.resolve(process.cwd(), '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  if (!content.includes('DATABASE_URL=')) {
    fs.appendFileSync(envPath, `\nDATABASE_URL="${dbUrl}"\n`);
    console.log('[ENV] Appended DATABASE_URL to .env');
  } else {
    // Replace existing empty or placeholder DATABASE_URL
    content = content.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${dbUrl}"`);
    fs.writeFileSync(envPath, content);
    console.log('[ENV] Updated DATABASE_URL in .env');
  }
} else {
  console.warn('[ENV] Warning: No DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL found in environment variables.');
}
