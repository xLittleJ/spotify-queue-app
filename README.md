# :musical_note: Spotify Queue App

A self-hosted web application that allows users to add songs to your Spotify queue. Built with Next.js 15.

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

## :bookmark: Table of Contents

- [Features](#sparkles-features)
- [Getting Started](#rocket-getting-started)
- [Installation](#installation)
- [Configuration](#gear-configuration)
- [Running the Application](#video_game-running-the-application)
- [Troubleshooting](#wrench-troubleshooting)
- [Contributing](#handshake-contributing)
- [License](#scroll-license)
- [Support](#sparkling_heart-support)

## :sparkles: Features

- :headphones: Let users add songs to your Spotify queue
- :lock: Secure authentication via Discord
- :shield: Cloudflare Turnstile protection against bots
- :no_entry_sign: Word filtering for song titles
- :memo: Optional Discord logging for queue submissions

## :rocket: Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** (v20 or later)
- **Yarn** package manager
- **PostgreSQL** database
- **Spotify Premium Account**
- **Discord Account**
- **A Domain** (for production deployment)
- **Cloudflare Account** (for Turnstile)

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/xlittlej/spotify-queue-app.git
   cd spotify-queue-app
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```

## :gear: Configuration

### 1. Spotify Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add redirect URIs:
   - Development: `http://localhost:3000/api/spotify/callback`
   - Production: `https://yourdomain.com/api/spotify/callback`
4. Note down the Client ID and Client Secret

### 2. Discord Setup

1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Under OAuth2, add redirect URIs:
   - Development: `http://localhost:3000/api/discord/callback`
   - Production: `https://yourdomain.com/api/discord/callback`
4. Note down the Client ID and Client Secret
5. Create a bot and note down the token

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

#### Spotify Configuration

- `SPOTIFY_CLIENT_ID` - From Spotify Developer Dashboard
- `SPOTIFY_CLIENT_SECRET` - From Spotify Developer Dashboard
- `SPOTIFY_USER_ID` - Your Spotify user ID (found in Profile)
- `SPOTIFY_REDIRECT_URI` - Default: `/api/spotify/callback`

#### Discord Configuration

- `DISCORD_CLIENT_ID` - From Discord Developer Portal
- `DISCORD_CLIENT_SECRET` - From Discord Developer Portal
- `DISCORD_REDIRECT_URI` - Default: `/api/discord/callback`
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_QUEUE_LOGS_CHANNEL_ID` - (Optional) Channel ID for logging
- `DISCORD_DEVELOPER_ID` - Your Discord user ID

#### Security

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - From Cloudflare Turnstile
- `TURNSTILE_SECRET_KEY` - From Cloudflare Turnstile
- `JWT_SECRET_KEY` - Generate using: `yarn jwt`
- `JWT_ENCRYPTION_KEY` - Generate using: `yarn jwt`

#### General

- `DOMAIN` - Your domain (e.g., `https://yourdomain.com`)
- `BANNED_WORDS` - (Optional) Comma-separated list of banned words
- `DATABASE_URL` - PostgreSQL connection string

### 4. Database Setup

```bash
# Generate Prisma client and push schema
npx prisma generate
npx prisma db push
```

## :video_game: Running the Application

### Development Mode

1. Start the development server:
   ```bash
   yarn dev
   ```
2. Visit `http://localhost:3000`
3. Authorize your Spotify account:
   ```
   http://localhost:3000/api/spotify/login
   ```

### Production Mode

1. Build the application:
   ```bash
   yarn build
   ```
2. Start the production server:
   ```bash
   yarn start
   ```

## :wrench: Troubleshooting

### Common Issues

1. **Spotify Authentication Failed**

   - Verify Spotify Premium subscription
   - Check redirect URIs in Spotify Dashboard
   - Ensure environment variables are correct

2. **Discord Login Issues**

   - Verify Discord application settings
   - Check redirect URIs in Discord Developer Portal
   - Ensure environment variables are correct

3. **Database Connection Errors**

   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure database exists (`npx prisma db push`)

## :memo: Usage

1. Host the application on your domain
2. Share the URL with your people
3. Users log in with Discord
4. Users can submit Spotify songs to automatically add to your queue

## :handshake: Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## :scroll: License

This project is licensed under the MIT License.

## :sparkling_heart: Support

If you find this project helpful, please consider giving it a star :star:
