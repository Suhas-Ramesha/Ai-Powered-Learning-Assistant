const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();

// Export Python functions (these will be deployed as separate functions)
exports.upload = require('./main').upload;
exports.chat = require('./main').chat;
exports.process_file = require('./main').process_file;

// Example HTTP function for testing
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.json({ message: 'Hello from Firebase Functions!' });
});
