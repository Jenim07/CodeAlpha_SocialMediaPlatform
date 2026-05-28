const express = require('express');
const router = express.Router();
const db = require('./db');
const { authenticateToken } = require('./auth');

// 1. Get Who to Follow Suggestions
router.get('/suggestions', authenticateToken, (req, res) => {
  try {
    const suggestions = db.getSuggestions(req.user.id);
    res.json(suggestions);
  } catch (error) {
    console.error("Suggestions error:", error);
    res.status(500).json({ error: "Server error fetching suggestions" });
  }
});

// 1b. Get all users for the Discover/Explore page
router.get('/discover', authenticateToken, (req, res) => {
  try {
    const users = db.getAllDiscoverUsers(req.user.id);
    res.json(users);
  } catch (error) {
    console.error("Discover users error:", error);
    res.status(500).json({ error: "Server error fetching users" });
  }
});

// 2. Update Profile Details
router.put('/profile', authenticateToken, (req, res) => {
  const { display_name, bio, avatar } = req.body;

  try {
    const updatedUser = db.updateUserProfile(req.user.id, { display_name, bio, avatar });
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully!",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Server error updating profile" });
  }
});

// 3. Get User Profile by Username (includes follow metrics and posts list)
router.get('/:username', authenticateToken, (req, res) => {
  const username = req.params.username.trim().toLowerCase();
  const user = db.getUserByUsername(username);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    const followCounts = db.getFollowCounts(user.id);
    const isFollowing = db.isFollowing(req.user.id, user.id);
    
    // Get all posts written by this specific user
    const data = db.read();
    const allPosts = data.posts.filter(p => p.user_id === user.id);
    const enrichedPosts = allPosts.map(post => {
      return {
        ...post,
        author: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar: user.avatar
        },
        likes_count: data.likes.filter(l => l.post_id === post.id).length,
        comments_count: data.comments.filter(c => c.post_id === post.id).length,
        liked_by_me: data.likes.some(l => l.user_id === req.user.id && l.post_id === post.id)
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      profile: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        created_at: user.created_at,
        followers_count: followCounts.followers,
        following_count: followCounts.following,
        is_following: isFollowing,
        is_me: req.user.id === user.id
      },
      posts: enrichedPosts
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ error: "Server error fetching profile details" });
  }
});

// 4. Toggle Follow/Unfollow on a User
router.post('/:username/follow', authenticateToken, (req, res) => {
  const targetUsername = req.params.username.trim().toLowerCase();
  const targetUser = db.getUserByUsername(targetUsername);

  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (req.user.id === targetUser.id) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  try {
    const followStatus = db.toggleFollow(req.user.id, targetUser.id);
    res.json(followStatus); // Returns { followed: boolean, followersCount: number, followingCount: number }
  } catch (error) {
    console.error("Toggle follow error:", error);
    res.status(500).json({ error: "Server error toggling follow status" });
  }
});

module.exports = router;
