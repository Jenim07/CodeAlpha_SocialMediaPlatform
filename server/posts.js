const express = require('express');
const router = express.Router();
const db = require('./db');
const { authenticateToken } = require('./auth');

// 1. Create a Post
router.post('/', authenticateToken, (req, res) => {
  const { content, image_url } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Post content cannot be empty" });
  }

  try {
    const post = db.createPost(req.user.id, content.trim(), image_url || "");
    const author = db.getUserById(req.user.id);
    
    // Construct rich response object
    const postWithAuthor = {
      ...post,
      author: {
        id: author.id,
        username: author.username,
        display_name: author.display_name,
        avatar: author.avatar
      },
      likes_count: 0,
      comments_count: 0,
      liked_by_me: false
    };

    res.status(201).json(postWithAuthor);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Server error creating post" });
  }
});

// 2. Get Feed (All posts if no follows, otherwise followed posts + own posts)
router.get('/', authenticateToken, (req, res) => {
  try {
    const feed = db.getFeed(req.user.id);
    res.json(feed);
  } catch (error) {
    console.error("Get feed error:", error);
    res.status(500).json({ error: "Server error fetching feed" });
  }
});

// 3. Toggle Like on a Post
router.post('/:id/like', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);
  const post = db.getPostById(postId);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  try {
    const likeStatus = db.toggleLike(req.user.id, postId);
    res.json(likeStatus); // Returns { liked: boolean, count: number }
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({ error: "Server error toggling like" });
  }
});

// 4. Fetch Comments of a Post
router.get('/:id/comments', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);
  const post = db.getPostById(postId);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  try {
    const comments = db.getComments(postId);
    
    // Augment comment entries with user info
    const enrichedComments = comments.map(comment => {
      const commenter = db.getUserById(comment.user_id);
      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        author: commenter ? {
          id: commenter.id,
          username: commenter.username,
          display_name: commenter.display_name,
          avatar: commenter.avatar
        } : null
      };
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Ascending comments order

    res.json(enrichedComments);
  } catch (error) {
    console.error("Fetch comments error:", error);
    res.status(500).json({ error: "Server error fetching comments" });
  }
});

// 5. Create a Comment on a Post
router.post('/:id/comments', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);
  const { content } = req.body;
  const post = db.getPostById(postId);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content cannot be empty" });
  }

  try {
    const newComment = db.createComment(postId, req.user.id, content.trim());
    const commenter = db.getUserById(req.user.id);

    const commentWithAuthor = {
      id: newComment.id,
      content: newComment.content,
      created_at: newComment.created_at,
      author: commenter ? {
        id: commenter.id,
        username: commenter.username,
        display_name: commenter.display_name,
        avatar: commenter.avatar
      } : null
    };

    res.status(201).json(commentWithAuthor);
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ error: "Server error adding comment" });
  }
});

module.exports = router;
