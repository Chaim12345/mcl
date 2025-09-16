#!/usr/bin/env node

/**
 * Build optimization scripts for frontend performance
 * Includes minification, code splitting, and asset optimization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Terser = require('terser');
const CleanCSS = require('clean-css');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminWebp = require('imagemin-webp');

class BuildOptimizer {
  constructor(config = {}) {
    this.config = {
      srcDir: config.srcDir || './frontend/vanilla',
      distDir: config.distDir || './frontend/vanilla/dist',
      jsDir: config.jsDir || './frontend/vanilla/js',
      cssDir: config.cssDir || './frontend/vanilla/css',
      imgDir: config.imgDir || './frontend/vanilla/images',
      ...config
    };
    
    this.stats = {
      originalSize: 0,
      optimizedSize: 0,
      savings: 0,
      processingTime: 0
    };
  }

  async optimize() {
    console.log('🚀 Starting build optimization...');
    const startTime = Date.now();
    
    // Clean dist directory
    this.cleanDist();
    
    // Create optimized build
    await Promise.all([
      this.optimizeJavaScript(),
      this.optimizeCSS(),
      this.optimizeImages(),
      this.createManifest(),
      this.generateServiceWorker()
    ]);
    
    // Generate bundle analysis
    this.generateBundleAnalysis();
    
    this.stats.processingTime = Date.now() - startTime;
    this.printStats();
    
    console.log('✅ Build optimization completed!');
  }

  cleanDist() {
    if (fs.existsSync(this.config.distDir)) {
      fs.rmSync(this.config.distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.config.distDir, { recursive: true });
  }

  async optimizeJavaScript() {
    console.log('📦 Optimizing JavaScript...');
    
    const jsFiles = this.getFilesByExtension(this.config.jsDir, '.js');
    const jsDistDir = path.join(this.config.distDir, 'js');
    fs.mkdirSync(jsDistDir, { recursive: true });
    
    // Create entry points
    const entryPoints = {
      main: path.join(this.config.jsDir, 'main.js'),
      vendor: path.join(this.config.jsDir, 'vendor.js'),
      components: path.join(this.config.jsDir, 'components', 'index.js')
    };
    
    // Bundle and minify
    for (const [name, entry] of Object.entries(entryPoints)) {
      if (fs.existsSync(entry)) {
        const content = fs.readFileSync(entry, 'utf-8');
        const result = await Terser.minify({ [entry]: content }, {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.warn']
          },
          mangle: true,
          sourceMap: true
        });
        
        if (result.error) {
          console.error(`Error minifying ${entry}:`, result.error);
          continue;
        }
        
        const minifiedPath = path.join(jsDistDir, `${name}.min.js`);
        fs.writeFileSync(minifiedPath, result.code);
        
        // Create source map
        if (result.map) {
          fs.writeFileSync(`${minifiedPath}.map`, result.map);
        }
        
        this.stats.originalSize += Buffer.byteLength(content, 'utf-8');
        this.stats.optimizedSize += Buffer.byteLength(result.code, 'utf-8');
      }
    }
    
    // Create lazy loading chunks
    await this.createLazyChunks(jsFiles, jsDistDir);
  }

  async createLazyChunks(jsFiles, distDir) {
    const chunkMap = {
      'board': ['BoardViewEnhanced.js', 'boardService.js'],
      'workspace': ['workspaceService.js'],
      'auth': ['authService.js'],
      'cache': ['cache.js', 'lazyLoading.js', 'performanceMonitor.js']
    };
    
    for (const [chunkName, files] of Object.entries(chunkMap)) {
      const chunkContent = [];
      
      for (const file of files) {
        const filePath = this.findFile(jsFiles, file);
        if (filePath) {
          const content = fs.readFileSync(filePath, 'utf-8');
          chunkContent.push(`// ${file}\n${content}`);
        }
      }
      
      if (chunkContent.length > 0) {
        const combined = chunkContent.join('\n\n');
        const result = await Terser.minify(combined, {
          compress: { drop_console: true },
          mangle: true
        });
        
        const chunkPath = path.join(distDir, `chunk-${chunkName}.min.js`);
        fs.writeFileSync(chunkPath, result.code);
      }
    }
  }

  async optimizeCSS() {
    console.log('🎨 Optimizing CSS...');
    
    const cssFiles = this.getFilesByExtension(this.config.cssDir, '.css');
    const cssDistDir = path.join(this.config.distDir, 'css');
    fs.mkdirSync(cssDistDir, { recursive: true });
    
    const cleanCSS = new CleanCSS({
      level: 2,
      format: 'beautify',
      sourceMap: true
    });
    
    for (const cssFile of cssFiles) {
      const content = fs.readFileSync(cssFile, 'utf-8');
      const result = cleanCSS.minify(content);
      
      if (result.errors.length > 0) {
        console.error(`CSS minification errors for ${cssFile}:`, result.errors);
        continue;
      }
      
      const filename = path.basename(cssFile, '.css');
      const minifiedPath = path.join(cssDistDir, `${filename}.min.css`);
      fs.writeFileSync(minifiedPath, result.styles);
      
      this.stats.originalSize += Buffer.byteLength(content, 'utf-8');
      this.stats.optimizedSize += Buffer.byteLength(result.styles, 'utf-8');
    }
  }

  async optimizeImages() {
    console.log('🖼️ Optimizing images...');
    
    if (!fs.existsSync(this.config.imgDir)) {
      console.log('No images directory found, skipping...');
      return;
    }
    
    const imgDistDir = path.join(this.config.distDir, 'images');
    fs.mkdirSync(imgDistDir, { recursive: true });
    
    // Optimize JPEG and PNG
    await imagemin([`${this.config.imgDir}/*.{jpg,jpeg,png}`], {
      destination: imgDistDir,
      plugins: [
        imageminMozjpeg({ quality: 85 }),
        imageminPngquant({ quality: [0.6, 0.8] })
      ]
    });
    
    // Create WebP versions
    await imagemin([`${this.config.imgDir}/*.{jpg,jpeg,png}`], {
      destination: imgDistDir,
      plugins: [
        imageminWebp({ quality: 80 })
      ]
    });
  }

  createManifest() {
    console.log('📋 Creating build manifest...');
    
    const manifest = {
      version: process.env.npm_package_version || '1.0.0',
      buildTime: new Date().toISOString(),
      files: {},
      chunks: {}
    };
    
    // Add JavaScript files
    const jsDistDir = path.join(this.config.distDir, 'js');
    if (fs.existsSync(jsDistDir)) {
      const jsFiles = fs.readdirSync(jsDistDir);
      jsFiles.forEach(file => {
        const filePath = path.join(jsDistDir, file);
        const stats = fs.statSync(filePath);
        manifest.files[`js/${file}`] = {
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
      });
    }
    
    // Add CSS files
    const cssDistDir = path.join(this.config.distDir, 'css');
    if (fs.existsSync(cssDistDir)) {
      const cssFiles = fs.readdirSync(cssDistDir);
      cssFiles.forEach(file => {
        const filePath = path.join(cssDistDir, file);
        const stats = fs.statSync(filePath);
        manifest.files[`css/${file}`] = {
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
      });
    }
    
    // Add image files
    const imgDistDir = path.join(this.config.distDir, 'images');
    if (fs.existsSync(imgDistDir)) {
      const imgFiles = fs.readdirSync(imgDistDir);
      imgFiles.forEach(file => {
        const filePath = path.join(imgDistDir, file);
        const stats = fs.statSync(filePath);
        manifest.files[`images/${file}`] = {
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        };
      });
    }
    
    // Write manifest file
    const manifestPath = path.join(this.config.distDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  generateServiceWorker() {
    console.log('📡 Generating service worker...');
    
    const swContent = `
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/css/main.min.css',
        '/js/main.min.js'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
    `.trim();
    
    const swPath = path.join(this.config.distDir, 'service-worker.js');
    fs.writeFileSync(swPath, swContent);
  }

  generateBundleAnalysis() {
    console.log('📊 Generating bundle analysis...');
    
    const analysis = {
      totalFiles: Object.keys(this.stats.files || {}).length,
      totalSize: this.stats.optimizedSize,
      savings: this.stats.savings,
      processingTime: this.stats.processingTime
    };
    
    const analysisPath = path.join(this.config.distDir, 'bundle-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  }

  printStats() {
    const savings = this.stats.originalSize - this.stats.optimizedSize;
    const savingsPercent = this.stats.originalSize > 0 ? (savings / this.stats.originalSize * 100).toFixed(2) : 0;
    
    console.log('\\n📈 Optimization Results:');
    console.log(`   Original size: ${(this.stats.originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Optimized size: ${(this.stats.optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`   Savings: ${savingsPercent}% (${(savings / 1024).toFixed(2)} KB)`);
    console.log(`   Processing time: ${this.stats.processingTime}ms\\n`);
  }

  getFilesByExtension(dir, ext) {
    if (!fs.existsSync(dir)) return [];
    
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesByExtension(fullPath, ext));
      } else if (path.extname(item) === ext) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  findFile(files, fileName) {
    return files.find(file => path.basename(file) === fileName);
  }
}

// Run optimizer if script is executed directly
if (require.main === module) {
  const optimizer = new BuildOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = BuildOptimizer;