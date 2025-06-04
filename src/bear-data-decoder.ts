#!/usr/bin/env node

// Bear Data Decoder - Attempt to extract readable data from CloudKit records

import sqlite3 from 'sqlite3';
import * as path from 'path';
import * as os from 'os';

const BEAR_CLOUDKIT_DB = path.join(
  os.homedir(),
  'Library/Containers/net.shinyfrog.bear/Data/CloudKit/c92f39c6ea98f57c13f84f9b283e7a7613347d0b/Records/Records.db'
);

interface BearRecord {
  recordID: string;
  zoneIdentifier: string;
  modificationTime: number;
  recordData: Buffer;
}

// Try to extract text from binary data
function extractTextFromBuffer(buffer: Buffer): string[] {
  const texts: string[] = [];
  const text = buffer.toString('utf8');
  
  // Look for readable text sequences (at least 4 characters, printable ASCII)
  const textMatches = text.match(/[\x20-\x7E]{4,}/g);
  if (textMatches) {
    texts.push(...textMatches);
  }
  
  // Also try looking for UTF-8 sequences
  const utf8Matches = text.match(/[^\x00-\x1F\x7F-\x9F]{4,}/g);
  if (utf8Matches) {
    texts.push(...utf8Matches.filter(t => !textMatches?.includes(t)));
  }
  
  return texts.filter(t => t.length >= 4);
}

// Extract potential notes data
function analyzeNoteRecord(record: BearRecord): any {
  const texts = extractTextFromBuffer(record.recordData);
  
  // Look for common note patterns
  const notePatterns = {
    titles: texts.filter(t => t.length < 100 && !t.includes('\n')),
    content: texts.filter(t => t.length > 20),
    tags: texts.filter(t => t.startsWith('#') || (t.includes('tag') && t.length < 50)),
    markdown: texts.filter(t => t.includes('#') || t.includes('*') || t.includes('`')),
  };
  
  return {
    recordID: record.recordID,
    modificationTime: new Date(record.modificationTime * 1000),
    extractedTexts: texts.slice(0, 10), // First 10 text sequences
    patterns: notePatterns,
    dataSize: record.recordData.length,
  };
}

// Main function to decode Bear data
function decodeBearData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(BEAR_CLOUDKIT_DB, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log("🔍 Decoding Bear CloudKit data...\n");
      
      // Get all notes records
      const query = `
        SELECT recordID, zoneIdentifier, modificationTime, recordData 
        FROM Record 
        WHERE zoneIdentifier LIKE '%Notes%' 
        AND recordData IS NOT NULL
        ORDER BY modificationTime DESC
      `;
      
      db.all(query, (err, rows: BearRecord[]) => {
        if (err) {
          console.error("Error fetching records:", err);
          db.close();
          reject(err);
          return;
        }
        
        console.log(`📊 Found ${rows.length} note records\n`);
        
        rows.forEach((record, index) => {
          console.log(`📝 Record ${index + 1}:`);
          console.log(`   ID: ${record.recordID.substring(0, 50)}...`);
          
          const analysis = analyzeNoteRecord(record);
          console.log(`   Modified: ${analysis.modificationTime.toISOString()}`);
          console.log(`   Data size: ${analysis.dataSize} bytes`);
          
          if (analysis.extractedTexts.length > 0) {
            console.log(`   📄 Extracted text snippets:`);
            analysis.extractedTexts.slice(0, 5).forEach((text: string, i: number) => {
              const clean = text.replace(/\s+/g, ' ').substring(0, 80);
              console.log(`      ${i + 1}. ${clean}${text.length > 80 ? '...' : ''}`);
            });
          }
          
          if (analysis.patterns.titles.length > 0) {
            console.log(`   🏷️  Potential titles: ${analysis.patterns.titles.slice(0, 2).join(', ')}`);
          }
          
          if (analysis.patterns.tags.length > 0) {
            console.log(`   🔖 Potential tags: ${analysis.patterns.tags.slice(0, 3).join(', ')}`);
          }
          
          console.log('');
        });
        
        // Try to find tag records
        console.log("🔍 Looking for tag data...\n");
        
        const tagQuery = `
          SELECT recordID, zoneIdentifier, recordData 
          FROM Record 
          WHERE (recordID LIKE '%tag%' OR recordID LIKE '%Tag%' OR zoneIdentifier LIKE '%tag%')
          AND recordData IS NOT NULL
        `;
        
        db.all(tagQuery, (err, tagRows: BearRecord[]) => {
          if (err) {
            console.error("Error fetching tag records:", err);
          } else {
            console.log(`📊 Found ${tagRows.length} potential tag records\n`);
            
            tagRows.forEach((record, index) => {
              console.log(`🔖 Tag Record ${index + 1}:`);
              console.log(`   ID: ${record.recordID}`);
              const texts = extractTextFromBuffer(record.recordData);
              if (texts.length > 0) {
                console.log(`   Extracted: ${texts.slice(0, 3).join(', ')}`);
              }
              console.log('');
            });
          }
          
          db.close();
          resolve();
        });
      });
    });
  });
}

// Run if called directly
if (require.main === module) {
  decodeBearData().catch(console.error);
}

export { decodeBearData };