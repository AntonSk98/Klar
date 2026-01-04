const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');



// Load environment variables
require('dotenv').config();

// Check for required environment variables
if (!process.env.OPENAI_TOKEN) {
    throw new Error('OPENAI_TOKEN environment variable is required. Please set it in your .env file.');
}
if (!process.env.MODEL) {
    throw new Error('MODEL environment variable is required. Please set it in your .env file.');
}

const REVIEW_PROMPT = fs.readFileSync(
    path.resolve('prompt-review.txt'),
    'utf8'
);

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
});

/**
 * Count words in text using OpenAI
 * @param {string} text - The text to count words in
 * @returns {Promise<number>} The word count
 */
async function reviewContent(reviewContentCommand) {
    try {
        const completion = await openai.chat.completions.create({
            model: process.env.MODEL,
            messages: [
                {
                    role: 'system',
                    content: REVIEW_PROMPT
                },
                {
                    role: 'user',
                    content: JSON.stringify(reviewContentCommand)
                }
            ]
        });

        const feedback = completion.choices[0].message.content;

        return JSON.parse(feedback);
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error('Failed to get review from OpenAI');
    }
}

module.exports = {
    reviewContent
};