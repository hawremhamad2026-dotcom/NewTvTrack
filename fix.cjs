const fs = require('fs');
let code = fs.readFileSync('src/components/DetailModal.tsx', 'utf8');

// Use string index of to locate exact lines
const idx1 = code.indexOf('        )}' + '\n' + '        {/* EPISODE COMMENTS MODAL (WINDOW) */}');
if (idx1 === -1) {
    console.error('idx1 not found');
    process.exit(1);
}
console.log('idx1 found');
