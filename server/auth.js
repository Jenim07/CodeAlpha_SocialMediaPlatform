const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

const JWT_SECRET = "AETHER_SUPER_SECRET_KEY_2026_JWT_TOKEN!!!";
const PASSWORD_SALT = "AETHER_SYSTEM_SALT_FOR_PASSWORDS_2026";

// SHA-256 Password hashing helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + PASSWORD_SALT).digest('hex');
}

// Middleware to protect routes and inject authenticated user
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    
    // Attach minimal user info
    req.user = {
      id: payload.id,
      username: payload.username
    };
    next();
  });
}

// Register Route
router.post('/register', (req, res) => {
  const { username, password, display_name, avatar, bio } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const cleanUsername = username.trim().toLowerCase();
  
  // Validate username characters
  if (!/^[a-z0-9_]{3,15}$/.test(cleanUsername)) {
    return res.status(400).json({ error: "Username must be 3-15 alphanumeric characters or underscores" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existingUser = db.getUserByUsername(cleanUsername);
  if (existingUser) {
    return res.status(400).json({ error: "Username is already taken" });
  }

  const passwordHash = hashPassword(password);
  
  try {
    const newUser = db.createUser({
      username: cleanUsername,
      display_name: (display_name || username).trim(),
      password_hash: passwordHash,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      bio: bio || "Just joined the Aether network! 👋"
    });

    // Create JWT Token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: "Registration successful!",
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        display_name: newUser.display_name,
        avatar: newUser.avatar,
        bio: newUser.bio
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login Route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = db.getUserByUsername(cleanUsername);

  if (!user) {
    return res.status(400).json({ error: "Invalid username or password" });
  }

  const passwordHash = hashPassword(password);
  if (user.password_hash !== passwordHash) {
    return res.status(400).json({ error: "Invalid username or password" });
  }

  // Create JWT Token
  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: "Login successful!",
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar: user.avatar,
      bio: user.bio
    }
  });
});

// Get Current User Info Route (Auth check)
router.get('/me', authenticateToken, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const followCounts = db.getFollowCounts(user.id);

  res.json({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar: user.avatar,
    bio: user.bio,
    created_at: user.created_at,
    followers_count: followCounts.followers,
    following_count: followCounts.following
  });
});

module.exports = {
  router,
  authenticateToken,
  JWT_SECRET
};
