const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});