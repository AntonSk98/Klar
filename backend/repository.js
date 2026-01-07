const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
require('dotenv').config();

// LowDB setup
const DB_PATH = path.resolve(process.env.DB_PATH || './db.json');
const adapter = new JSONFile(DB_PATH);
const db = new Low(adapter, { documents: [], contents: [] });

// Error constants
const DUPLICATE_DOCUMENT_ERROR = new Error('Document with this title already exists');
const DOCUMENT_NOT_FOUND_ERROR = new Error('Document not found');

/**
 * Initialize the database on startup
 */
async function initializeDatabase() {
    try {
        await db.read();
        console.log('💾 Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// ==================== DOCUMENT OPERATIONS ====================
/**
 * Get all documents
 * @returns {Promise<Array<{id: string, title: string, creationDate: string}>>} List of documents
 */
async function getDocuments() {
    await db.read();
    return db.data.documents || [];
}

/**
 * Get a document by ID
 * @param {string} id - Document ID
 * @returns {Promise<{id: string, title: string, creationDate: string}|null>} Document or null if not found
 */
async function getDocument(id) {
    await db.read();
    return db.data.documents.find(doc => doc.id === id) || null;
}

/**
 * Create a new document
 * @param {string} title - Document title
 * @returns {Promise<{id: string, title: string, creationDate: string}>} Created document
 * @throws {Error} If document with same title already exists
 */
async function createDocument(title) {
    await db.read();

    // Check if document with same title exists
    const exists = db.data.documents.some(doc => doc.title === title);
    if (exists) {
        throw DUPLICATE_DOCUMENT_ERROR;
    }

    const document = {
        id: generateId(),
        title: title,
        creationDate: new Date().toISOString().split('T')[0]
    };

    db.data.documents.push(document);
    await db.write();
    return document;
}

/**
 * Delete a document by ID and its associated content
 * @param {string} id - Document ID
 * @returns {Promise<void>}
 * @throws {Error} If document not found
 */
async function deleteDocument(id) {
    await db.read();

    // Find document index
    const docIndex = db.data.documents.findIndex(doc => doc.id === id);
    if (docIndex === -1) {
        throw DOCUMENT_NOT_FOUND_ERROR;
    }

    // Remove document
    const doc = db.data.documents[docIndex];
    db.data.documents.splice(docIndex, 1);

    // Find associated content index
    const contentIndex = db.data.contents.findIndex(c => c.documentId === doc.id);
    if (contentIndex !== -1) {
        db.data.contents.splice(contentIndex, 1);
    }

    await db.write();
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

// ==================== CONTENT OPERATIONS ====================
/**
 * Get content for a document by document ID
 * @param {string} documentId - The document ID
 * @returns {Promise<{documentId: string, task: string, submissionText: string, reviewScore: number|null, reviewFeedback: string, correction: string}>} Content object or empty object if not found
 */
async function getContent(documentId) {
    try {
        await db.read();
        return db.data.contents.find(content => content.documentId === documentId) || {};
    } catch (error) {
        console.error('Database read error:', error);
        throw error;
    }
}

/**
 * Upsert content in the database (insert or update)
 * @param {Object} upsertContentCommand - The content object to insert or update
 * @param {string} upsertContentCommand.documentId - The document ID (required)
 * @param {string} [upsertContentCommand.task] - The task description
 * @param {string} [upsertContentCommand.submissionText] - The user's submission text
 * @param {number|null} [upsertContentCommand.reviewScore] - The review score
 * @param {string} [upsertContentCommand.reviewFeedback] - The review feedback
 * @param {string} [upsertContentCommand.correction] - The corrected text
 * @returns {Promise<void>}
 * @throws {Error} If documentId is missing
 */
async function upsertContent(upsertContentCommand) {
    try {
        await db.read();

        if (!upsertContentCommand.documentId) {
            throw new Error('Missing documentId in content');
        }

        // Find existing content index
        const index = db.data.contents.findIndex(
            content => content.documentId === upsertContentCommand.documentId
        );

        // Remove existing content if found
        if (index !== -1) {
            db.data.contents.splice(index, 1);
        }

        const content = {
            documentId: upsertContentCommand.documentId,
            task: upsertContentCommand.task ?? '',
            submissionText: upsertContentCommand.submissionText ?? '',
            reviewScore: upsertContentCommand.reviewScore ?? null,
            reviewFeedback: upsertContentCommand.reviewFeedback ?? '',
            correction: upsertContentCommand.correction ?? ''
        };

        // Add new content at the end
        db.data.contents.push(content);

        await db.write();
    } catch (error) {
        console.error('Database write error:', error);
        throw error;
    }
}


module.exports = {
    initializeDatabase,
    getDocuments,
    getDocument,
    createDocument,
    deleteDocument,
    getContent,
    upsertContent,
    DUPLICATE_DOCUMENT_ERROR
};