const fs = require('fs');
const babel = require('@babel/parser');

try {
  const code = fs.readFileSync('mobile/src/screens/shared/ChatThreadScreen.tsx', 'utf-8');
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
  console.log('NO SYNTAX ERRORS');
} catch (e) {
  console.error(e);
}
