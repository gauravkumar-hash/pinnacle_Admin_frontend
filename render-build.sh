#!/bin/bash
# This script is used by Render to serve the SPA correctly

# Build the app
pnpm install --frozen-lockfile
pnpm run build

# Copy index.html to be served for all routes
cd dist

# Create a simple Node.js server that serves the SPA
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname)));

// Serve index.html for all routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
EOF
