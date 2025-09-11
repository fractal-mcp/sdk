#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function updateVersions(newVersion) {
  console.log(`🔄 Updating all packages to version ${newVersion}...`);
  
  // Get all package.json files in packages directory
  const packagesDir = path.join(__dirname, '../packages');
  const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  const fractalPackages = [];
  
  // First pass: update all package versions and collect package names
  packageDirs.forEach(dir => {
    const packageJsonPath = path.join(packagesDir, dir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Update version
      const oldVersion = packageJson.version;
      packageJson.version = newVersion;
      
      // Collect @fractal package names
      if (packageJson.name && packageJson.name.startsWith('@fractal-mcp/')) {
        fractalPackages.push(packageJson.name);
      }
      
      // Write back the updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ Updated ${packageJson.name}: ${oldVersion} → ${newVersion}`);
    }
  });
  
  // Second pass: update internal dependencies
  console.log(`\n🔗 Updating internal dependencies...`);
  packageDirs.forEach(dir => {
    const packageJsonPath = path.join(packagesDir, dir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      let updated = false;
      
      // Update dependencies
      ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
        if (packageJson[depType]) {
          fractalPackages.forEach(fractalPkg => {
            if (packageJson[depType][fractalPkg] && packageJson[depType][fractalPkg] !== newVersion) {
              const oldDep = packageJson[depType][fractalPkg];
              packageJson[depType][fractalPkg] = newVersion;
              console.log(`  📦 ${packageJson.name}: ${fractalPkg} ${oldDep} → ${newVersion}`);
              updated = true;
            }
          });
        }
      });
      
      if (updated) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      }
    }
  });
  
  // Update root package.json
  const rootPackageJsonPath = path.join(__dirname, '../package.json');
  if (fs.existsSync(rootPackageJsonPath)) {
    const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
    const oldRootVersion = rootPackageJson.version;
    rootPackageJson.version = newVersion;
    fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');
    console.log(`\n✅ Updated root package: ${oldRootVersion} → ${newVersion}`);
  }
  
  console.log(`\n🎉 All packages updated to version ${newVersion}!`);
  console.log(`📦 Updated packages: ${fractalPackages.join(', ')}`);
}

// Get version from command line argument
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('❌ Please provide a version number');
  console.error('Usage: node scripts/update-versions.js 1.2.3');
  process.exit(1);
}

// Validate version format (basic semver check)
if (!/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(newVersion)) {
  console.error('❌ Invalid version format. Please use semantic versioning (e.g., 1.2.3)');
  process.exit(1);
}

updateVersions(newVersion); 