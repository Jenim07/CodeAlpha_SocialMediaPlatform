const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'database.json');

// Initialize database template
const defaultDb = {
  users: [],
  posts: [],
  comments: [],
  likes: [], // Array of { user_id, post_id }
  follows: [] // Array of { follower_id, following_id }
};

const PASSWORD_SALT = "AETHER_SYSTEM_SALT_FOR_PASSWORDS_2026";
const SEED_PASSWORD_HASH = crypto.createHash('sha256').update("admin" + PASSWORD_SALT).digest('hex');

// Seed Data
const seedData = {
  users: [
    {
      id: 1,
      username: "antigravity",
      display_name: "Antigravity Dev",
      password_hash: SEED_PASSWORD_HASH, // password is "admin"
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80", // Premium abstract avatar
      bio: "Crafting beautiful interactive experiences. Pair programming with AI! 🚀✨",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() // 5 days ago
    },
    {
      id: 2,
      username: "nova_explorer",
      display_name: "Nova Stargazer",
      password_hash: SEED_PASSWORD_HASH, // password is "admin"
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", // Premium portrait
      bio: "Astrophotographer, dream chaser, and lover of glowing night skies. 🌌🌌",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString() // 4 days ago
    },
    {
      id: 3,
      username: "design_pulse",
      display_name: "Aura Design",
      password_hash: SEED_PASSWORD_HASH, // password is "admin"
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", // Premium portrait
      bio: "Dedicated to the art of glassmorphism, glowing micro-animations, and CSS magic. Let's build the future! 🎨✨",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() // 3 days ago
    }
  ],
  posts: [
    {
      id: 1,
      user_id: 3,
      content: "Welcome to Aether! 🌟 I've been refining this interface with custom backdrop-filters, smooth transitions, and high-fidelity glows. Standard layouts are a thing of the past. Drop your feedback below!",
      image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() // 12 hours ago
    },
    {
      id: 2,
      user_id: 2,
      content: "Shot this glowing nebula from my backyard last night. The vastness of space never fails to blow my mind. ✨🔭 Are we alone in the cosmic ocean?",
      image_url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop&q=80",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() // 8 hours ago
    },
    {
      id: 3,
      user_id: 1,
      content: "Pair programming is the fastest way to learn. There's something truly magical about building clean, performant applications from scratch in a unified stack. Who's writing code today?",
      image_url: "",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
    }
  ],
  comments: [
    {
      id: 1,
      post_id: 1,
      user_id: 1,
      content: "This looks absolutely breathtaking! The glassmorphism borders and vibrant typography make it feel incredibly premium. Good job! 👏🔥",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString()
    },
    {
      id: 2,
      post_id: 1,
      user_id: 2,
      content: "The colors are perfectly tuned. It feels like stepping into a sci-fi cockpit. Lovin' it!",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString()
    },
    {
      id: 3,
      post_id: 2,
      user_id: 1,
      content: "Incredible shot! What lens and exposure time did you use? This belongs in a gallery. 🌌",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString()
    }
  ],
  likes: [
    { user_id: 1, post_id: 1 },
    { user_id: 2, post_id: 1 },
    { user_id: 1, post_id: 2 },
    { user_id: 3, post_id: 2 }
  ],
  follows: [
    { follower_id: 1, following_id: 2 },
    { follower_id: 1, following_id: 3 },
    { follower_id: 2, following_id: 1 },
    { follower_id: 3, following_id: 1 }
  ]
};

// Database helper functions
class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_PATH)) {
      console.log("Database file not found. Creating and seeding initial data...");
      fs.writeFileSync(DB_PATH, JSON.stringify(seedData, null, 2), 'utf8');
    }
  }

  read() {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading database:", error);
      return defaultDb;
    }
  }

  write(data) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error("Error writing database:", error);
      return false;
    }
  }

  // USER CRUD
  getUsers() {
    return this.read().users;
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === parseInt(id));
  }

  getUserByUsername(username) {
    if (!username) return null;
    return this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  createUser(userData) {
    const db = this.read();
    const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: newId,
      username: userData.username.toLowerCase(),
      display_name: userData.display_name || userData.username,
      password_hash: userData.password_hash,
      avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userData.username)}`,
      bio: userData.bio || "Just joined the Aether network! 👋",
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    this.write(db);
    return newUser;
  }

  updateUserProfile(userId, profileData) {
    const db = this.read();
    const index = db.users.findIndex(u => u.id === parseInt(userId));
    if (index === -1) return null;

    db.users[index].display_name = profileData.display_name || db.users[index].display_name;
    db.users[index].bio = profileData.bio !== undefined ? profileData.bio : db.users[index].bio;
    db.users[index].avatar = profileData.avatar || db.users[index].avatar;

    this.write(db);
    return db.users[index];
  }

  // POST CRUD
  getPosts() {
    return this.read().posts;
  }

  getPostById(id) {
    return this.getPosts().find(p => p.id === parseInt(id));
  }

  createPost(userId, content, imageUrl = "") {
    const db = this.read();
    const newId = db.posts.length > 0 ? Math.max(...db.posts.map(p => p.id)) + 1 : 1;
    const newPost = {
      id: newId,
      user_id: parseInt(userId),
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };
    db.posts.unshift(newPost); // Add to beginning
    this.write(db);
    return newPost;
  }

  // COMMENT CRUD
  getComments(postId) {
    return this.read().comments.filter(c => c.post_id === parseInt(postId));
  }

  createComment(postId, userId, content) {
    const db = this.read();
    const newId = db.comments.length > 0 ? Math.max(...db.comments.map(c => c.id)) + 1 : 1;
    const newComment = {
      id: newId,
      post_id: parseInt(postId),
      user_id: parseInt(userId),
      content,
      created_at: new Date().toISOString()
    };
    db.comments.push(newComment);
    this.write(db);
    return newComment;
  }

  // LIKES
  isLiked(userId, postId) {
    const db = this.read();
    return db.likes.some(l => l.user_id === parseInt(userId) && l.post_id === parseInt(postId));
  }

  toggleLike(userId, postId) {
    const db = this.read();
    const uId = parseInt(userId);
    const pId = parseInt(postId);
    const index = db.likes.findIndex(l => l.user_id === uId && l.post_id === pId);
    let liked = false;

    if (index === -1) {
      db.likes.push({ user_id: uId, post_id: pId });
      liked = true;
    } else {
      db.likes.splice(index, 1);
      liked = false;
    }

    this.write(db);
    return { liked, count: db.likes.filter(l => l.post_id === pId).length };
  }

  getLikesCount(postId) {
    return this.read().likes.filter(l => l.post_id === parseInt(postId)).length;
  }

  // FOLLOWS
  isFollowing(followerId, followingId) {
    const db = this.read();
    return db.follows.some(f => f.follower_id === parseInt(followerId) && f.following_id === parseInt(followingId));
  }

  toggleFollow(followerId, followingId) {
    const db = this.read();
    const fId = parseInt(followerId);
    const foId = parseInt(followingId);
    if (fId === foId) return { error: "You cannot follow yourself" };

    const index = db.follows.findIndex(f => f.follower_id === fId && f.following_id === foId);
    let followed = false;

    if (index === -1) {
      db.follows.push({ follower_id: fId, following_id: foId });
      followed = true;
    } else {
      db.follows.splice(index, 1);
      followed = false;
    }

    this.write(db);
    return {
      followed,
      followersCount: db.follows.filter(f => f.following_id === foId).length,
      followingCount: db.follows.filter(f => f.follower_id === fId).length
    };
  }

  getFollowCounts(userId) {
    const db = this.read();
    const uId = parseInt(userId);
    return {
      followers: db.follows.filter(f => f.following_id === uId).length,
      following: db.follows.filter(f => f.follower_id === uId).length
    };
  }

  // FEED GENERATION
  getFeed(userId) {
    const db = this.read();
    const uId = parseInt(userId);
    
    // Get list of users this user is following
    const followingIds = db.follows
      .filter(f => f.follower_id === uId)
      .map(f => f.following_id);
    
    // Add own user id to feed
    followingIds.push(uId);

    let feedPosts = db.posts.filter(p => followingIds.includes(p.user_id));

    // Fallback: If feed is sparse or user is new/doesn't follow anyone, include all posts to ensure feed isn't empty.
    if (feedPosts.length === 0) {
      feedPosts = db.posts;
    }

    // Enhance post entries with author info, like count, comment count, and whether current user liked it
    return feedPosts.map(post => {
      const author = db.users.find(u => u.id === post.user_id);
      return {
        ...post,
        author: author ? {
          id: author.id,
          username: author.username,
          display_name: author.display_name,
          avatar: author.avatar
        } : null,
        likes_count: db.likes.filter(l => l.post_id === post.id).length,
        comments_count: db.comments.filter(c => c.post_id === post.id).length,
        liked_by_me: db.likes.some(l => l.user_id === uId && l.post_id === post.id)
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // SUGGESTIONS
  getSuggestions(userId) {
    const db = this.read();
    const uId = parseInt(userId);

    // Users already followed by the user
    const followedIds = db.follows
      .filter(f => f.follower_id === uId)
      .map(f => f.following_id);

    // Suggest users who are NOT the user themselves AND are NOT already followed
    const suggestions = db.users.filter(u => u.id !== uId && !followedIds.includes(u.id));

    return suggestions.map(u => {
      const counts = this.getFollowCounts(u.id);
      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar: u.avatar,
        bio: u.bio,
        followers_count: counts.followers
      };
    }).slice(0, 5); // Return top 5 suggestions
  }

  getAllDiscoverUsers(userId) {
    const db = this.read();
    const uId = parseInt(userId);
    const followedIds = db.follows
      .filter(f => f.follower_id === uId)
      .map(f => f.following_id);

    return db.users
      .filter(u => u.id !== uId)
      .map(u => {
        const counts = this.getFollowCounts(u.id);
        return {
          id: u.id,
          username: u.username,
          display_name: u.display_name,
          avatar: u.avatar,
          bio: u.bio,
          followers_count: counts.followers,
          is_followed: followedIds.includes(u.id)
        };
      });
  }
}

module.exports = new Database();
