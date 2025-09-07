// This script uses CommonJS require, run with node.
const esbuild = require('esbuild');
const fs = require('fs-extra');
const path = require('path');
const packageJson = require('./package.json');

const distDir = 'dist';

async function build() {
  try {
    // 1. Clean the dist directory
    await fs.emptyDir(distDir);
    console.log('Cleaned dist directory.');

    // Read API_KEY from the build environment
    const apiKey = process.env.API_KEY || '';
    const appVersion = packageJson.version;

    // 2. Build the TypeScript/React code
    await esbuild.build({
      entryPoints: ['index.tsx'],
      bundle: true,
      outfile: path.join(distDir, 'bundle.js'),
      minify: true,
      sourcemap: true,
      loader: { '.tsx': 'tsx' },
      define: { 
        'process.env.NODE_ENV': "'production'",
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.APP_VERSION': JSON.stringify(appVersion),
      },
    });
    console.log('JavaScript bundled successfully.');

    // 3. Read, modify, and write index.html
    let htmlContent = await fs.readFile('index.html', 'utf-8');
    
    // Remove importmap
    htmlContent = htmlContent.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
    
    // Change the main script tag to point to the bundle
    htmlContent = htmlContent.replace(
      '<script type="module" src="./index.tsx"></script>',
      '<script defer src="./bundle.js"></script>'
    );
    
    await fs.writeFile(path.join(distDir, 'index.html'), htmlContent);
    console.log('index.html processed and copied to dist.');

    console.log('\nBuild complete! The "dist" folder is ready for deployment.');

  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
}

build();