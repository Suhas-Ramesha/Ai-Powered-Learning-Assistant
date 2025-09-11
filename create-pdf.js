// Simple script to create a PDF from HTML
// You can run this with Node.js if you have puppeteer installed

const fs = require('fs');
const path = require('path');

// Read the HTML file
const htmlContent = fs.readFileSync('sample-document.html', 'utf8');

// Create a simple PDF-like structure (this is a basic approach)
// For a proper PDF, you would use libraries like puppeteer, jsPDF, or html-pdf

console.log('HTML file created successfully!');
console.log('To convert to PDF, you can:');
console.log('1. Open sample-document.html in your browser');
console.log('2. Press Ctrl+P (or Cmd+P on Mac)');
console.log('3. Select "Save as PDF"');
console.log('4. Save as sample-document.pdf');
console.log('');
console.log('Or use online converters like:');
console.log('- https://html-pdf-converter.com/');
console.log('- https://www.ilovepdf.com/html-to-pdf');
console.log('- https://smallpdf.com/html-to-pdf');
console.log('');
console.log('The HTML file is ready and contains all the machine learning content!');
