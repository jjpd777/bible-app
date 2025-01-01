import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BIBLE_PATH = path.join(__dirname, '../assets/bible/rv1909.json');

async function validateBible() {
  const spinner = ora('Starting Bible validation...').start();
  
  try {
    const bible = await fs.readJson(BIBLE_PATH);
    const books = bible.books;
    let totalErrors = 0;
    
    console.log('\n=== Bible Validation Report ===\n');

    for (const bookId in books) {
      const book = books[bookId];
      console.log(`\nBook: ${book.name} (${bookId})`);
      
      const chapters = book.chapters;
      console.log(`Total Chapters: ${Object.keys(chapters).length}`);
      
      for (const chapterNum in chapters) {
        const chapter = chapters[chapterNum];
        const contentLength = chapter.content.length;
        
        // Check for potential issues
        const hasContent = contentLength > 0;
        const hasWeirdCharacters = /[<>]/.test(chapter.content);
        const hasEmptyVerses = chapter.content.includes('    '); // Check for multiple spaces that might indicate missing verses
        
        if (!hasContent || hasWeirdCharacters || hasEmptyVerses) {
          totalErrors++;
          console.log(`[ERROR] Chapter ${chapterNum}:`);
          if (!hasContent) console.log('- Empty content');
          if (hasWeirdCharacters) console.log('- Contains HTML tags');
          if (hasEmptyVerses) console.log('- Possible missing verses');
        } else {
          console.log(`[OK] Chapter ${chapterNum}: ${contentLength} characters`);
        }
      }
    }
    
    console.log('\n=== Summary ===');
    if (totalErrors === 0) {
      spinner.succeed('Validation complete - No errors found!');
    } else {
      spinner.fail(`Validation complete - Found ${totalErrors} potential issues`);
    }
    
  } catch (error) {
    spinner.fail('Error validating Bible data');
    console.error('Error details:', error);
    process.exit(1);
  }
}

validateBible();