const fs = require('fs');
const path = require('path');

// Auto-detect project root
let rootDir = process.cwd();
if (!fs.existsSync(path.join(rootDir, 'index.html'))) {
  if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    rootDir = __dirname;
  } else if (fs.existsSync(path.join(rootDir, '..', 'index.html'))) {
    rootDir = path.join(rootDir, '..');
  }
}

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItem => {
      copyRecursive(path.join(src, childItem), path.join(dest, childItem));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy assets to dist
fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
copyRecursive(path.join(rootDir, 'css'), path.join(distDir, 'css'));
copyRecursive(path.join(rootDir, 'js'), path.join(distDir, 'js'));
copyRecursive(path.join(rootDir, 'assets'), path.join(distDir, 'assets'));

console.log('Built isolated frontend bundle in:', distDir);
