#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PROJECTS_DIR = './public/projects';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function findLargeFiles(dir) {
  const largeFiles = [];
  
  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stats.isFile()) {
          const size = stats.size;
          if (size > MAX_FILE_SIZE) {
            largeFiles.push({
              path: fullPath,
              size: size,
              formattedSize: formatFileSize(size),
              extension: path.extname(item).toLowerCase()
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentDir}:`, error.message);
    }
  }
  
  scanDirectory(dir);
  return largeFiles;
}

console.log('🔍 Scanning for large files...');
const largeFiles = findLargeFiles(PROJECTS_DIR);

console.log('\n🔍 LARGE FILE ANALYSIS REPORT');
console.log('=====================================\n');

if (largeFiles.length === 0) {
  console.log('✅ No files larger than 10MB found!');
} else {
  console.log(`⚠️  Found ${largeFiles.length} files larger than 10MB:\n`);
  
  largeFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.path}`);
    console.log(`   Size: ${file.formattedSize}`);
    console.log(`   Type: ${file.extension}`);
    console.log('');
  });
  
  const totalSize = largeFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(`📊 Total size of large files: ${formatFileSize(totalSize)}`);
} 