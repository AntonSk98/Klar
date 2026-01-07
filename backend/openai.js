const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Check for required environment variables
if (!process.env.OPENAI_TOKEN) {
    throw new Error('OPENAI_TOKEN environment variable is required. Please set it in your .env file.');
}
if (!process.env.MODEL) {
    throw new Error('MODEL environment variable is required. Please set it in your .env file.');
}

const REVIEW_PROMPT = fs.readFileSync(
    path.join(__dirname, 'prompt-review.txt'),
    'utf8'
);

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
});

/**
 * Review content using OpenAI and get feedback
 * @param {Object} reviewContentCommand - The review command
 * @param {string} reviewContentCommand.taskContent - The task/prompt description
 * @param {string} reviewContentCommand.contentText - The user's submission text to review
 * @returns {Promise<{score: number, feedback: string, correction: string}>} Review result with score, feedback and corrected text
 * @throws {Error} If OpenAI API call fails
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