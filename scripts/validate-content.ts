import { validateContent } from '../src/content/validate.ts';

const release = process.argv.includes('--release');
const problems = validateContent(release);
if (problems.length) {
  console.error(`Content ${release ? 'release' : 'development'} check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Content ${release ? 'release' : 'development'} check passed.`);
