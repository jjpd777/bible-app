import fetch from 'node-fetch';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API configuration (same as your app)
const API_KEY = 'a199ed5ad2b126cdc4b2630580930967';
const BIBLE_ID = '592420522e16049f-01'; // Reina Valera 1909
const OUTPUT_PATH = path.join(__dirname, '../assets/bible/rv1909.json');

// Helper function from your existing code
const cleanVerseContent = (html) => {
  return html
    .replace(/<\/?p[^>]*>/g, '')
    .replace(/<\/?span[^>]*>/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .trim();
};

async function fetchBibleData() {
  const spinner = ora('Starting Bible fetch...').start();
  const bible = { books: {} };

  try {
    // 1. Fetch all books
    spinner.text = 'Fetching book list...';
    const booksResponse = await fetch(
      `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/books`,
      {
        headers: {
          'api-key': API_KEY,
          'accept': 'application/json',
        },
      }
    );
    
    const booksData = await booksResponse.json();
    const books = booksData.data;

    // 2. Fetch each book's chapters and content
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      spinner.text = `Processing book ${i + 1}/${books.length}: ${book.name}`;

      bible.books[book.id] = {
        name: book.name,
        chapters: {},
      };

      // Fetch chapters for this book
      const chaptersResponse = await fetch(
        `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/books/${book.id}/chapters`,
        {
          headers: {
            'api-key': API_KEY,
            'accept': 'application/json',
          },
        }
      );

      const chaptersData = await chaptersResponse.json();
      const chapters = chaptersData.data.filter(chapter => chapter.number !== 'intro');

      // Fetch content for each chapter
      for (let j = 0; j < chapters.length; j++) {
        const chapter = chapters[j];
        spinner.text = `Processing ${book.name} ${chapter.number} (${i + 1}/${books.length})`;

        const chapterResponse = await fetch(
          `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/chapters/${chapter.id}`,
          {
            headers: {
              'api-key': API_KEY,
              'accept': 'application/json',
          },
        }
        );

        const chapterData = await chapterResponse.json();
        const content = cleanVerseContent(chapterData.data.content);

        bible.books[book.id].chapters[chapter.number] = {
          content: content,
        };

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Save the complete Bible to file
    spinner.text = 'Saving Bible data to file...';
    await fs.ensureDir(path.dirname(OUTPUT_PATH));
    await fs.writeJson(OUTPUT_PATH, bible, { spaces: 2 });

    spinner.succeed(`Bible data successfully saved to ${OUTPUT_PATH}`);

  } catch (error) {
    spinner.fail('Error fetching Bible data');
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the script
fetchBibleData();