import fs from 'fs';
import path from 'path';

// Manual env parsing
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const key = keyMatch ? keyMatch[1].trim().replace(/['"]/g, '') : null;

async function check() {
  if (!key) {
    console.error("No GEMINI_API_KEY found in .env.local");
    return;
  }
  
  console.log("Diagnostic starting for key:", key.substring(0, 8) + "...");
  
  const versions = ['v1', 'v1beta'];
  
  for (const v of versions) {
    console.log(`\nTesting API Version: ${v}`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${key}`);
      const data = await res.json();
      
      if (data.error) {
        console.error(`Error [${data.error.code}]: ${data.error.message}`);
        continue;
      }
      
      if (data.models) {
        const supported = data.models
          .filter(m => m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.split('/').pop());
        
        if (supported.length > 0) {
          console.log(`✅ Success! Working model names for ${v}:`);
          supported.forEach(name => console.log(`  - ${name}`));
        } else {
          console.log(`❌ No 'generateContent' models found in ${v}`);
        }
      }
    } catch (e) {
      console.error(`Fetch failed for ${v}:`, e.message);
    }
  }
}

check();
