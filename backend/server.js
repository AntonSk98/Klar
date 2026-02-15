const express = require('express');
const { VIEWS_DIR, PUBLIC_DIR, PORT } = require('./config');
const repository = require('./repository');
const apiRoutes = require('./routes/api');
const partialRoutes = require('./routes/partials');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

// View engine
app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);

// Routes
app.use('/api', apiRoutes);
app.use(partialRoutes);

async function start() {
    await repository.initializeDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Klar server running on port ${PORT}`);
    });
}

start().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});