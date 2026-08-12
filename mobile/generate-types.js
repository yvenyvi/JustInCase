const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

// Assuming the FastAPI backend runs locally on port 8000
const BACKEND_URL = 'http://127.0.0.1:8000/openapi.json';
const OUTPUT_FILE = 'src/types/api.d.ts';
const LOCAL_SCHEMA_FILE = 'openapi.json';

console.log(`Fetching OpenAPI spec from ${BACKEND_URL}...`);

http.get(BACKEND_URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to fetch schema. Status code: ${res.statusCode}. Is the backend running?`);
    process.exit(1);
  }

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync(LOCAL_SCHEMA_FILE, data);
    console.log('Saved OpenAPI spec to local file. Generating types...');
    
    try {
      // Ensure the output directory exists
      const path = require('path');
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
      
      // Execute openapi-typescript
      execSync(`npx openapi-typescript ${LOCAL_SCHEMA_FILE} -o ${OUTPUT_FILE}`, { stdio: 'inherit' });
      console.log(`Successfully generated types to ${OUTPUT_FILE}`);
    } catch (err) {
      console.error('Failed to generate types:', err.message);
    } finally {
      // Clean up the temporary schema file
      if (fs.existsSync(LOCAL_SCHEMA_FILE)) {
        fs.unlinkSync(LOCAL_SCHEMA_FILE);
      }
    }
  });
}).on('error', (err) => {
  console.error(`Error fetching OpenAPI spec: ${err.message}. Please ensure your Python backend is running.`);
});
