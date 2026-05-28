const express = require('express');
const path = require('path');
const db = require('./server/db'); // Initializes db and seeds if necessary

const authRouter = require('./server/auth').router;
const postsRouter = require('./server/posts');
const usersRouter = require('./server/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// Log incoming requests for easy debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Serve frontend static assets from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Bind REST API Routers
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/users', usersRouter);

// API 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// SPA Route Fallback: Redirect all non-API paths to serve index.html
// This allows clean browser URL navigation or reload without 404s!
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Port listener with automatic fallback if port is in use
function startServer(port) {
  const server = app.listen(port);
  server.on('listening', () => {
    console.log(`\n======================================================`);
    console.log(`  🌟 AETHER SOCIAL MEDIA PLATFORM RUNNING SUCCESSFULLY 🌟`);
    console.log(`  🔗 Portal: http://localhost:${port}`);
    console.log(`  📁 Database: Relational JSON storage initialized.`);
    console.log(`  ======================================================\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
