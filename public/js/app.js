/* ==========================================================================
   AETHER CLIENT ENGINE — REACTIVE SPA STATE & ANIMATION DISPATCHER
   ========================================================================== */

// Client Global State
let currentUser = null;
let token = localStorage.getItem('aether_token') || null;
let currentView = 'feed';
let activePostIdComments = null;
let profileUsernameView = null; // Username of profile currently viewed

// Helper: API fetch wrapper that signs all requests with JWT header
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    // If token is invalid or expired, log out automatically
    if (response.status === 401 || response.status === 403) {
      if (token) {
        handleLogout();
        showAuthError("Session expired. Please sign in again.");
      }
    }
    throw new Error(data.error || 'API Request failed');
  }

  return data;
}

// ==========================================================================
// INITIALIZATION & SESSION RESTORE
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
});

async function restoreSession() {
  if (!token) {
    showAuthScreen();
    return;
  }

  try {
    const user = await apiFetch('/api/auth/me');
    loginSuccess(token, user);
  } catch (error) {
    console.error("Session restore failed:", error);
    handleLogout();
  }
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-layout').classList.add('hidden');
}

function showAppScreen() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-layout').classList.remove('hidden');
}

// ==========================================================================
// AUTHENTICATION FLOW
// ==========================================================================
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');
  const authError = document.getElementById('auth-error');
  
  authError.classList.add('hidden');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTab.classList.add('active');
    regTab.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    loginTab.classList.remove('active');
    regTab.classList.add('active');
  }
}

function showAuthError(message) {
  const errorBox = document.getElementById('auth-error');
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

async function handleLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  const authError = document.getElementById('auth-error');
  authError.classList.add('hidden');

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: usernameInput.value,
        password: passwordInput.value
      })
    });
    
    loginSuccess(data.token, data.user);
    
    // Clear inputs
    usernameInput.value = '';
    passwordInput.value = '';
  } catch (error) {
    showAuthError(error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('reg-username');
  const displayNameInput = document.getElementById('reg-display-name');
  const passwordInput = document.getElementById('reg-password');
  const bioInput = document.getElementById('reg-bio');

  const authError = document.getElementById('auth-error');
  authError.classList.add('hidden');

  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: usernameInput.value,
        display_name: displayNameInput.value,
        password: passwordInput.value,
        bio: bioInput.value
      })
    });

    loginSuccess(data.token, data.user);

    // Clear inputs
    usernameInput.value = '';
    displayNameInput.value = '';
    passwordInput.value = '';
    bioInput.value = '';
  } catch (error) {
    showAuthError(error.message);
  }
}

function loginSuccess(jwtToken, user) {
  token = jwtToken;
  currentUser = user;
  
  localStorage.setItem('aether_token', token);
  
  // Update UI user nodes
  document.getElementById('sidebar-user-avatar').src = user.avatar;
  document.getElementById('sidebar-user-name').textContent = user.display_name;
  document.getElementById('sidebar-user-username').textContent = `@${user.username}`;
  document.getElementById('creator-avatar').src = user.avatar;
  document.getElementById('comment-input-avatar').src = user.avatar;

  showAppScreen();
  navigateTo('feed');
  loadFollowSuggestions();
}

function handleLogout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('aether_token');
  showAuthScreen();
}

// ==========================================================================
// SPA CORE ROUTING
// ==========================================================================
function navigateTo(view) {
  currentView = view;
  
  // Update view menu active classes
  document.getElementById('nav-feed').classList.remove('active');
  document.getElementById('nav-explore').classList.remove('active');
  document.getElementById('nav-profile').classList.remove('active');
  
  document.getElementById('view-feed').classList.add('hidden');
  document.getElementById('view-explore').classList.add('hidden');
  document.getElementById('view-profile').classList.add('hidden');

  if (view === 'feed') {
    document.getElementById('nav-feed').classList.add('active');
    document.getElementById('view-feed').classList.remove('active');
    document.getElementById('view-feed').classList.remove('hidden');
    document.getElementById('view-title').textContent = "Home Feed";
    loadFeed();
  } else if (view === 'explore') {
    document.getElementById('nav-explore').classList.add('active');
    document.getElementById('view-explore').classList.remove('active');
    document.getElementById('view-explore').classList.remove('hidden');
    document.getElementById('view-title').textContent = "Explore Space";
    loadExplore();
  }
}

async function navigateToProfile(username) {
  currentView = 'profile';
  profileUsernameView = username.toLowerCase();
  
  // Highlight Nav Item if it's the current logged-in user
  document.getElementById('nav-feed').classList.remove('active');
  document.getElementById('nav-explore').classList.remove('active');
  
  if (currentUser && profileUsernameView === currentUser.username.toLowerCase()) {
    document.getElementById('nav-profile').classList.add('active');
  } else {
    document.getElementById('nav-profile').classList.remove('active');
  }

  document.getElementById('view-feed').classList.add('hidden');
  document.getElementById('view-explore').classList.add('hidden');
  document.getElementById('view-profile').classList.remove('hidden');
  
  document.getElementById('view-title').textContent = `@${username}'s Profile`;
  
  loadUserProfile(username);
}

// ==========================================================================
// DATA FETCHING & UI GENERATORS
// ==========================================================================

// Load feed (posts written by followed users + self)
async function loadFeed() {
  const container = document.getElementById('posts-container');
  container.innerHTML = '<div class="empty-stream"><span class="empty-icon">🛰️</span>Gathering stars (fetching feed)...</div>';

  try {
    const posts = await apiFetch('/api/posts');
    renderPostsStream(posts, container);
  } catch (error) {
    console.error("Feed error:", error);
    container.innerHTML = `<div class="empty-stream"><span class="empty-icon">⚠️</span>Error fetching posts: ${error.message}</div>`;
  }
}

// Load Explore (people + all posts in the network)
async function loadExplore() {
  loadExplorePeople();
  loadExplorePosts();
}

async function loadExplorePosts() {
  const container = document.getElementById('explore-posts-container');
  container.innerHTML = '<div class="empty-stream"><span class="empty-icon">🌌</span>Connecting with cosmic signals...</div>';

  try {
    const posts = await apiFetch('/api/posts');
    renderPostsStream(posts, container);
  } catch (error) {
    console.error("Explore error:", error);
    container.innerHTML = `<div class="empty-stream"><span class="empty-icon">⚠️</span>Error fetching explore feed: ${error.message}</div>`;
  }
}

async function loadExplorePeople() {
  const container = document.getElementById('explore-people-container');
  container.innerHTML = '<div class="empty-stream"><span class="empty-icon">👥</span>Loading explorers...</div>';

  try {
    const users = await apiFetch('/api/users/discover');
    container.innerHTML = '';

    if (users.length === 0) {
      container.innerHTML = '<p class="input-note">No other explorers found in the network.</p>';
      return;
    }

    users.forEach(user => {
      const card = document.createElement('div');
      card.className = 'explore-user-card card';
      card.innerHTML = `
        <div class="explore-user-avatar-row" onclick="navigateToProfile('${user.username}')">
          <img src="${user.avatar}" alt="Avatar" class="avatar-lg">
        </div>
        <div class="explore-user-info" onclick="navigateToProfile('${user.username}')">
          <span class="explore-user-name">${user.display_name}</span>
          <span class="explore-user-username">@${user.username}</span>
          <p class="explore-user-bio">${escapeHTML(user.bio || '')}</p>
        </div>
        <div class="explore-user-footer">
          <span class="explore-user-followers">${user.followers_count} followers</span>
          <button class="${user.is_followed ? 'btn-following' : 'btn-follow'}" onclick="event.stopPropagation(); toggleFollowSuggestion('${user.username}', this)">
            ${user.is_followed ? 'Following' : 'Follow'}
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Explore people error:", error);
    container.innerHTML = '';
  }
}

// Load Who To Follow suggestions
async function loadFollowSuggestions() {
  const suggestionsBox = document.getElementById('suggestions-list');
  suggestionsBox.innerHTML = '';

  try {
    const suggestions = await apiFetch('/api/users/suggestions');
    if (suggestions.length === 0) {
      suggestionsBox.innerHTML = '<p class="input-note">You are connected to everyone! 🚀</p>';
      return;
    }

    suggestions.forEach(user => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <div class="suggestion-profile" onclick="navigateToProfile('${user.username}')">
          <img src="${user.avatar}" alt="Avatar" class="avatar-sm">
          <div class="suggestion-meta">
            <span class="suggestion-name">${user.display_name}</span>
            <span class="suggestion-username">@${user.username}</span>
          </div>
        </div>
        <button class="btn-follow" onclick="toggleFollowSuggestion('${user.username}', this)">Follow</button>
      `;
      suggestionsBox.appendChild(item);
    });
  } catch (error) {
    console.error("Suggestions fetch error:", error);
  }
}

// Load User Profile detail page
async function loadUserProfile(username) {
  const postsContainer = document.getElementById('profile-posts-container');
  postsContainer.innerHTML = '<div class="empty-stream"><span class="empty-icon">✨</span>Retrieving profile timeline...</div>';

  try {
    const data = await apiFetch(`/api/users/${username}`);
    const profile = data.profile;
    const posts = data.posts;

    // Set stats and fields
    document.getElementById('profile-card-name').textContent = profile.display_name;
    document.getElementById('profile-card-username').textContent = `@${profile.username}`;
    document.getElementById('profile-card-bio').textContent = profile.bio || "This user hasn't written a biography yet.";
    document.getElementById('profile-card-avatar').src = profile.avatar;

    document.getElementById('profile-stat-posts').textContent = posts.length;
    document.getElementById('profile-stat-followers').textContent = profile.followers_count;
    document.getElementById('profile-stat-following').textContent = profile.following_count;

    // Follow/Edit profile action buttons management
    const editBtn = document.getElementById('edit-profile-btn');
    const followBtn = document.getElementById('follow-profile-btn');

    if (profile.is_me) {
      editBtn.classList.remove('hidden');
      followBtn.classList.add('hidden');
    } else {
      editBtn.classList.add('hidden');
      followBtn.classList.remove('hidden');
      
      if (profile.is_following) {
        followBtn.textContent = 'Following';
        followBtn.className = 'btn-secondary';
      } else {
        followBtn.textContent = 'Follow';
        followBtn.className = 'btn-primary';
      }
    }

    renderPostsStream(posts, postsContainer);
  } catch (error) {
    console.error("Profile load error:", error);
    postsContainer.innerHTML = `<div class="empty-stream"><span class="empty-icon">⚠️</span>Failed to load profile details.</div>`;
  }
}

// Dynamic post items renderer
function renderPostsStream(posts, container) {
  container.innerHTML = '';
  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-stream">
        <span class="empty-icon">🪐</span>
        <p>No cosmic pulses here yet.</p>
        <p class="input-note">Be the first to share an idea!</p>
      </div>
    `;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('article');
    card.className = 'post-card card';
    
    // Formatting relative time
    const timeFormatted = formatRelativeTime(post.created_at);

    // Build optional post image attachment
    let attachmentHtml = '';
    if (post.image_url) {
      attachmentHtml = `
        <div class="post-attachment">
          <img src="${post.image_url}" alt="Attachment" loading="lazy">
        </div>
      `;
    }

    card.innerHTML = `
      <div class="post-header">
        <div class="post-author" onclick="navigateToProfile('${post.author.username}')">
          <img src="${post.author.avatar}" alt="Avatar" class="avatar-md">
          <div class="author-meta">
            <span class="author-name">${post.author.display_name}</span>
            <span class="author-username">@${post.author.username}</span>
          </div>
        </div>
        <span class="post-time">${timeFormatted}</span>
      </div>

      <div class="post-content">${escapeHTML(post.content)}</div>
      
      ${attachmentHtml}

      <div class="post-footer">
        <button class="post-action like-btn ${post.liked_by_me ? 'liked' : ''}" onclick="toggleLike(${post.id}, this)">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span class="like-count">${post.likes_count}</span>
        </button>

        <button class="post-action comment-btn" onclick="openCommentsModal(${post.id})">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>${post.comments_count}</span>
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// ==========================================================================
// INTERACTIVE POST / LIKE / FOLLOW WORKFLOWS
// ==========================================================================

// Create a Post
async function submitPost() {
  const textInput = document.getElementById('post-input-text');
  const imageUrlInput = document.getElementById('attached-image-url');
  const content = textInput.value.trim();
  const imageUrl = imageUrlInput.value.trim();

  if (!content) return;

  try {
    const post = await apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content, image_url: imageUrl })
    });

    // Reset post creator
    textInput.value = '';
    imageUrlInput.value = '';
    clearAttachedImage();

    // Reload active feed
    if (currentView === 'feed') {
      loadFeed();
    } else if (currentView === 'explore') {
      loadExplore();
    } else if (currentView === 'profile' && profileUsernameView === currentUser.username.toLowerCase()) {
      navigateToProfile(currentUser.username);
    }
  } catch (error) {
    alert("Post creation failed: " + error.message);
  }
}

// Toggle Like
async function toggleLike(postId, button) {
  const isLiked = button.classList.contains('liked');
  const likeCountSpan = button.querySelector('.like-count');
  let currentCount = parseInt(likeCountSpan.textContent);

  // Optimistic UI updates
  if (isLiked) {
    button.classList.remove('liked');
    likeCountSpan.textContent = Math.max(0, currentCount - 1);
  } else {
    button.classList.add('liked');
    likeCountSpan.textContent = currentCount + 1;
  }

  try {
    const data = await apiFetch(`/api/posts/${postId}/like`, { method: 'POST' });
    // Synced real data
    likeCountSpan.textContent = data.count;
    if (data.liked) {
      button.classList.add('liked');
    } else {
      button.classList.remove('liked');
    }
  } catch (error) {
    console.error("Like error:", error);
    // Revert optimistic updates
    if (isLiked) {
      button.classList.add('liked');
      likeCountSpan.textContent = currentCount;
    } else {
      button.classList.remove('liked');
      likeCountSpan.textContent = currentCount;
    }
  }
}

// Follow/Unfollow from User profile page
async function toggleFollowProfile() {
  if (!profileUsernameView) return;
  const followBtn = document.getElementById('follow-profile-btn');
  const followersStat = document.getElementById('profile-stat-followers');
  const isFollowing = followBtn.classList.contains('btn-secondary');

  try {
    const data = await apiFetch(`/api/users/${profileUsernameView}/follow`, { method: 'POST' });
    
    // Update Button State
    if (data.followed) {
      followBtn.textContent = 'Following';
      followBtn.className = 'btn-secondary';
    } else {
      followBtn.textContent = 'Follow';
      followBtn.className = 'btn-primary';
    }

    followersStat.textContent = data.followersCount;
    loadFollowSuggestions(); // Refresh recommendations sidebar
  } catch (error) {
    alert("Follow action failed: " + error.message);
  }
}

// Follow/Unfollow directly from Suggestions widget
async function toggleFollowSuggestion(username, button) {
  button.disabled = true;

  try {
    const data = await apiFetch(`/api/users/${username}/follow`, { method: 'POST' });
    
    if (data.followed) {
      button.textContent = 'Following';
      button.className = 'btn-following';
    } else {
      button.textContent = 'Follow';
      button.className = 'btn-follow';
    }
    
    // Slight delay, then refresh suggestions and profile if active
    setTimeout(() => {
      loadFollowSuggestions();
      if (currentView === 'profile' && profileUsernameView === username.toLowerCase()) {
        loadUserProfile(username);
      } else if (currentView === 'feed') {
        loadFeed(); // Update feed to include followed user's posts
      }
    }, 400);

  } catch (error) {
    alert("Follow action failed: " + error.message);
    button.disabled = false;
  }
}

// ==========================================================================
// COMMENTS DRAWER (MODAL WORKFLOWS)
// ==========================================================================
async function openCommentsModal(postId) {
  activePostIdComments = postId;
  
  const commentsModal = document.getElementById('comments-modal');
  const commentsBox = document.getElementById('comments-list');
  const commentInputText = document.getElementById('comment-input-text');
  
  commentInputText.value = '';
  commentsBox.innerHTML = '<div class="empty-stream">Connecting comment nodes...</div>';
  
  commentsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Stop page scrolling

  try {
    const comments = await apiFetch(`/api/posts/${postId}/comments`);
    renderComments(comments);
  } catch (error) {
    console.error("Comments error:", error);
    commentsBox.innerHTML = `<p class="error-toast">Error fetching comments.</p>`;
  }
}

function closeCommentsModal(e) {
  // If event object is present, only close if background overlay was clicked
  if (e && e.target !== document.getElementById('comments-modal')) return;

  document.getElementById('comments-modal').classList.add('hidden');
  document.body.style.overflow = ''; // Restore background scrolling
  activePostIdComments = null;

  // Refresh feeds to update comment count badge!
  if (currentView === 'feed') {
    loadFeed();
  } else if (currentView === 'explore') {
    loadExplore();
  } else if (currentView === 'profile') {
    loadUserProfile(profileUsernameView);
  }
}

function renderComments(comments) {
  const container = document.getElementById('comments-list');
  container.innerHTML = '';

  if (comments.length === 0) {
    container.innerHTML = `
      <div class="empty-stream">
        <span class="empty-icon">💬</span>
        <p>Quiet skies. No comments yet.</p>
        <p class="input-note">Be the first to speak!</p>
      </div>
    `;
    return;
  }

  comments.forEach(comment => {
    const item = document.createElement('div');
    item.className = 'comment-item';
    
    const formattedTime = formatRelativeTime(comment.created_at);

    item.innerHTML = `
      <img src="${comment.author.avatar}" alt="Avatar" class="avatar-sm" onclick="navigateToProfileFromComment('${comment.author.username}')">
      <div class="comment-body">
        <div class="comment-author-row">
          <div>
            <span class="comment-author-name" onclick="navigateToProfileFromComment('${comment.author.username}')">${comment.author.display_name}</span>
            <span class="comment-author-username">@${comment.author.username}</span>
          </div>
          <span class="comment-time">${formattedTime}</span>
        </div>
        <div class="comment-text">${escapeHTML(comment.content)}</div>
      </div>
    `;
    container.appendChild(item);
  });

  // Auto-scroll comments drawer to the bottom
  container.scrollTop = container.scrollHeight;
}

// Redirect commenter click to their profile and close modal
function navigateToProfileFromComment(username) {
  closeCommentsModal(null);
  navigateToProfile(username);
}

async function submitComment(event) {
  event.preventDefault();
  if (!activePostIdComments) return;

  const textInput = document.getElementById('comment-input-text');
  const content = textInput.value.trim();
  if (!content) return;

  try {
    const newComment = await apiFetch(`/api/posts/${activePostIdComments}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    textInput.value = '';
    
    // Refresh comments drawer
    const comments = await apiFetch(`/api/posts/${activePostIdComments}/comments`);
    renderComments(comments);
  } catch (error) {
    alert("Comment submission failed: " + error.message);
  }
}

// ==========================================================================
// PROFILE MODIFIER MODALS
// ==========================================================================
function openEditProfileModal() {
  if (!currentUser) return;

  document.getElementById('edit-display-name').value = currentUser.display_name;
  document.getElementById('edit-bio').value = currentUser.bio || '';
  document.getElementById('edit-avatar-url').value = currentUser.avatar;
  document.getElementById('edit-profile-avatar-preview').src = currentUser.avatar;
  
  document.getElementById('edit-profile-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeEditProfileModal(e) {
  if (e && e.target !== document.getElementById('edit-profile-modal')) return;
  document.getElementById('edit-profile-modal').classList.add('hidden');
  document.getElementById('edit-profile-error').classList.add('hidden');
  document.body.style.overflow = '';
}

function selectPresetAvatar(src) {
  document.getElementById('edit-avatar-url').value = src;
  document.getElementById('edit-profile-avatar-preview').src = src;
}

function updateEditAvatarPreview() {
  const urlInput = document.getElementById('edit-avatar-url');
  const preview = document.getElementById('edit-profile-avatar-preview');
  if (urlInput.value.trim()) {
    preview.src = urlInput.value.trim();
  }
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  const displayName = document.getElementById('edit-display-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const avatar = document.getElementById('edit-avatar-url').value.trim();

  const errorBox = document.getElementById('edit-profile-error');
  errorBox.classList.add('hidden');

  try {
    const data = await apiFetch('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({
        display_name: displayName,
        bio: bio,
        avatar: avatar
      })
    });

    // Synchronize client local state
    currentUser = data.user;
    
    // Update top bar, sidebar, and workspace items
    document.getElementById('sidebar-user-avatar').src = currentUser.avatar;
    document.getElementById('sidebar-user-name').textContent = currentUser.display_name;
    document.getElementById('creator-avatar').src = currentUser.avatar;
    document.getElementById('comment-input-avatar').src = currentUser.avatar;

    closeEditProfileModal(null);
    
    // Reload active profile view
    navigateToProfile(currentUser.username);
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove('hidden');
  }
}

// ==========================================================================
// WORKSPACE UTILITY & PRESENTATION HELPERS
// ==========================================================================

// Image Attachment UI drawer toggling
function toggleAttachImagePrompt() {
  const drawer = document.getElementById('image-drawer');
  drawer.classList.toggle('hidden');
  if (!drawer.classList.contains('hidden')) {
    document.getElementById('attached-image-url').focus();
  }
}

function handleImageAttachPreview() {
  const urlInput = document.getElementById('attached-image-url');
  const previewBox = document.getElementById('creator-media-preview-box');
  const previewImg = document.getElementById('creator-media-preview-img');
  
  if (urlInput.value.trim()) {
    previewImg.src = urlInput.value.trim();
    previewBox.classList.remove('hidden');
  } else {
    clearAttachedImage();
  }
}

function clearAttachedImage() {
  document.getElementById('attached-image-url').value = '';
  document.getElementById('creator-media-preview-box').classList.add('hidden');
  document.getElementById('creator-media-preview-img').src = '';
  document.getElementById('image-drawer').classList.add('hidden');
}

// Floating Sidebar "Create Post" button actions
function openCreatePostModal() {
  navigateTo('feed');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  const creatorBox = document.querySelector('.post-creator-card');
  creatorBox.style.transform = 'scale(1.02)';
  creatorBox.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.2)';
  
  setTimeout(() => {
    creatorBox.style.transform = '';
    creatorBox.style.boxShadow = '';
    document.getElementById('post-input-text').focus();
  }, 350);
}

// Autosize textarea growing as text is typed
function autoExpandTextarea(element) {
  element.style.height = 'auto';
  element.style.height = (element.scrollHeight) + 'px';
}

// Escape HTML tags to prevent cross-site scripting issues
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Format relative time tags (e.g. "5 minutes ago", "3 hours ago")
function formatRelativeTime(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
