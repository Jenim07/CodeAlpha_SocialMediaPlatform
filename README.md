# Aether — Spark Conversations

A premium **glassmorphic mini social media platform** built with Node.js, Express, and vanilla JavaScript. Features a cosmic, frosted-glass UI with real-time interactions.

## Features

- **User Authentication** — Register and login with JWT-based auth (7-day tokens)
- **Create Posts** — Share thoughts with optional image attachments
- **Like & Comment** — Engage with posts through likes and threaded comments
- **Follow System** — Follow/unfollow users to curate your feed
- **Explore Page** — Discover new people and posts across the network
- **User Profiles** — View profiles with stats, bio, and post history
- **Edit Profile** — Update display name, bio, and avatar (DiceBear presets)
- **Glassmorphic UI** — Modern frosted-glass design with animated glow orbs
- **JSON Storage** — Lightweight file-based database (no external DB required)
- **SPA Architecture** — Seamless client-side navigation

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Node.js, Express |
| Frontend | Vanilla JS, CSS3 (Glassmorphism) |
| Auth     | JSON Web Tokens (jsonwebtoken) |
| Storage  | JSON file (server/db.js) |
| Font     | Outfit (Google Fonts) |
| Avatars  | DiceBear API |

## Getting Started

### Prerequisites

- Node.js v14+
- npm

### Installation

```bash
npm install
```

### Run the Server

```bash
npm start
```


## Project Structure

```
├── server.js              # Entry point — Express server
├── package.json
├── database.json          # JSON file database
├── public/
│   ├── index.html         # SPA entry point
│   ├── css/
│   │   └── style.css      # Glassmorphic styles
│   └── js/
│       └── app.js         # Client-side logic
├── server/
│   ├── auth.js            # Auth routes & JWT middleware
│   ├── db.js              # JSON database operations
│   ├── posts.js           # Post CRUD & comments
│   └── users.js           # User profiles & follow system
└── .gitignore
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user (auth required)

### Posts
- `GET /api/posts` — Get feed (auth required)
- `POST /api/posts` — Create a post (auth required)
- `POST /api/posts/:id/like` — Toggle like (auth required)
- `GET /api/posts/:id/comments` — Get comments (auth required)
- `POST /api/posts/:id/comments` — Add comment (auth required)

### Users
- `GET /api/users/suggestions` — Who to follow (auth required)
- `GET /api/users/discover` — All users (auth required)
- `GET /api/users/:username` — User profile (auth required)
- `PUT /api/users/profile` — Update profile (auth required)
- `POST /api/users/:username/follow` — Toggle follow (auth required)

## License

ISC
