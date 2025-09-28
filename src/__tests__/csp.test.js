const fs = require('fs');
const path = require('path');

describe('CSP in index.html', () => {
  test('应包含严格的 CSP，允许 img data:', () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'src/index.html'), 'utf8');
    expect(html).toMatch(/<meta[^>]+http-equiv="Content-Security-Policy"/i);
    expect(html).toMatch(/img-src[^;]*data:/i);
  });
});

