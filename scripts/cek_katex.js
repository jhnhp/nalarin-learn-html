// Dipanggil oleh cek_kualitas.py: node scripts/cek_katex.js <katex.min.js>
// Membaca [[tex, display], ...] dari stdin, menulis daftar galat (null bila rumus lolos).
const path = require('path');
const katex = require(path.resolve(process.argv[2]));

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const result = JSON.parse(input).map(([tex, display]) => {
    try {
      katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: 'ignore' });
      return null;
    } catch (err) {
      return String(err.message).slice(0, 160);
    }
  });
  process.stdout.write(JSON.stringify(result));
});
