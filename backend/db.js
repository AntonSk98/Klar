const fs = require('fs');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

// Load environment variables
require('dotenv').config();

// Check for required environment variables
if (!process.env.DB_PATH) {
    throw new Error('DB_PATH environment variable is required. Please set it in your .env file.');
}

// LowDB setup
const DB_PATH = path.join(path.resolve(process.env.DB_PATH));
const adapter = new JSONFile(DB_PATH);
const db = new Low(adapter, { content: {} });

/**
 * Initialize the database on startup
 */
async function initializeDatabase() {
    try {
        await db.read();
        console.log('💾 Database initialized successfully');
        console.log(DB_PATH)
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

/**
 * Get data from database by key
 * @param {string} key - The key to retrieve
 * @returns {string} The value or empty string if not found
 */
async function getData(key) {
    try {
        await db.read();
        return db.data.content[key] || '';
    } catch (error) {
        console.error('Database read error:', error);
        throw error;
    }
}

/**
 * Set data in database
 * @param {string} key - The key to set
 * @param {string} value - The value to store
 */
async function setData(key, value) {
    try {
        await db.read();
        db.data.content[key] = value;
        await db.write();
    } catch (error) {
        console.error('Database write error:', error);
        throw error;
    }
}

/**
 * Delete data from database by key
 * @param {string} key - The key to delete
 */
async function deleteData(key) {
    try {
        await db.read();
        if (db.data.content[key]) {
            delete db.data.content[key];
            await db.write();
        }
    } catch (error) {
        console.error('Database delete error:', error);
        throw error;
    }
}

/**
 * Delete all data associated with a key (task and content)
 * @param {string} key - The base key
 */
async function deletePageData(key) {
    await deleteData(`${key}-task`);
    await deleteData(`${key}-content`);
    await deleteData(`${key}-content-review-score`);
    await deleteData(`${key}-content-review-feedback`);
    await deleteData(`${key}-content-review-correction`);
}

module.exports = {
    initializeDatabase,
    getData,
    setData,
    deleteData,
    deletePageData,
};