#!/usr/bin/env node

// Bear Database Explorer - Experimental tool to understand Bear's data structure

import sqlite3 from 'sqlite3';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const BEAR_CONTAINER_PATH = path.join(
  os.homedir(),
  'Library/Containers/net.shinyfrog.bear/Data'
);

// Try to find Bear database files
function findBearDatabases(): string[] {
  const databases: string[] = [];
  
  // CloudKit database
  const cloudKitPath = path.join(BEAR_CONTAINER_PATH, 'CloudKit');
  if (fs.existsSync(cloudKitPath)) {
    const dirs = fs.readdirSync(cloudKitPath);
    for (const dir of dirs) {
      const recordsPath = path.join(cloudKitPath, dir, 'Records', 'Records.db');
      if (fs.existsSync(recordsPath)) {
        databases.push(recordsPath);
      }
    }
  }
  
  // Look for other SQLite files
  const appSupportPath = path.join(BEAR_CONTAINER_PATH, 'Library/Application Support/net.shinyfrog.bear');
  if (fs.existsSync(appSupportPath)) {
    const files = fs.readdirSync(appSupportPath, { recursive: true });
    for (const file of files) {
      if (typeof file === 'string' && (file.endsWith('.sqlite') || file.endsWith('.db'))) {
        const fullPath = path.join(appSupportPath, file);
        if (fs.existsSync(fullPath)) {
          databases.push(fullPath);
        }
      }
    }
  }
  
  return databases;
}

// Examine CloudKit record data
function examineCloudKitRecords(dbPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`\n🔍 Examining CloudKit database: ${dbPath}`);
      
      // Get record count
      db.get("SELECT COUNT(*) as count FROM Record", (err, row: any) => {
        if (err) {
          console.error("Error counting records:", err);
        } else {
          console.log(`📊 Total records: ${row.count}`);
        }
        
        // Sample some records
        db.all("SELECT recordID, zoneIdentifier, modificationTime, size FROM Record LIMIT 10", (err, rows: any[]) => {
          if (err) {
            console.error("Error fetching records:", err);
          } else {
            console.log("\n📋 Sample records:");
            rows.forEach((row, index) => {
              console.log(`${index + 1}. ID: ${row.recordID}`);
              console.log(`   Zone: ${row.zoneIdentifier}`);
              console.log(`   Modified: ${new Date(row.modificationTime * 1000).toISOString()}`);
              console.log(`   Size: ${row.size} bytes`);
            });
          }
          
          // Try to examine record data
          db.get("SELECT recordData FROM Record WHERE recordData IS NOT NULL LIMIT 1", (err, row: any) => {
            if (err) {
              console.error("Error fetching record data:", err);
            } else if (row && row.recordData) {
              console.log("\n🔬 Sample record data structure:");
              const buffer = row.recordData as Buffer;
              console.log(`   Data size: ${buffer.length} bytes`);
              console.log(`   First 100 bytes (hex): ${buffer.subarray(0, 100).toString('hex')}`);
              
              // Try to find text patterns
              const textContent = buffer.toString('utf8', 0, Math.min(500, buffer.length));
              const printableText = textContent.replace(/[^\x20-\x7E]/g, '.');
              console.log(`   Printable text sample: ${printableText.substring(0, 200)}`);
            }
            
            db.close();
            resolve();
          });
        });
      });
    });
  });
}

// Main exploration function
async function exploreBearDatabase() {
  console.log("🐻 Bear Database Explorer");
  console.log("========================");
  
  const databases = findBearDatabases();
  
  if (databases.length === 0) {
    console.log("❌ No Bear databases found");
    console.log("Make sure Bear is installed and has been used to create notes");
    return;
  }
  
  console.log(`✅ Found ${databases.length} database(s):`);
  databases.forEach((db, index) => {
    console.log(`${index + 1}. ${db}`);
  });
  
  // Examine each database
  for (const dbPath of databases) {
    try {
      if (dbPath.includes('CloudKit')) {
        await examineCloudKitRecords(dbPath);
      } else {
        // Handle other database types
        console.log(`\n🔍 Other database: ${dbPath}`);
        // Could add more exploration here
      }
    } catch (error) {
      console.error(`Error examining ${dbPath}:`, error);
    }
  }
  
  console.log("\n🏁 Exploration complete!");
  console.log("\nNext steps:");
  console.log("1. Analyze the CloudKit record data structure");
  console.log("2. Look for patterns that indicate notes vs tags vs other data");
  console.log("3. Try to decode the binary record data");
}

// Run if called directly
if (require.main === module) {
  exploreBearDatabase().catch(console.error);
}

export { exploreBearDatabase, findBearDatabases };