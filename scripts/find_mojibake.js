import fs from 'node:fs';
import path from 'node:path';

const mojibakePatterns = [/\uFFFD/, /เธ/, /เน€/, /อ©/, /โ€/];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDirectory(fullPath);
      }
    } else if (
      stat.isFile() &&
      (file.endsWith('.js') ||
        file.endsWith('.jsx') ||
        file.endsWith('.css') ||
        file.endsWith('.html'))
    ) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let hasMojibake = false;

  lines.forEach((line, index) => {
    for (const pattern of mojibakePatterns) {
      if (pattern.test(line)) {
        if (!hasMojibake) {
          console.log(`\n[MOJIBAKE] File: ${filePath}`);
          hasMojibake = true;
        }
        console.log(`  Line ${index + 1}: ${line.trim().slice(0, 100)}`);
        break;
      }
    }
  });
}

console.log('Scanning src directory for mojibake/corrupted encodings...');
scanDirectory('src');
console.log('\nScan complete!');
