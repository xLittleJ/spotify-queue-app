# Spotify Queue App

This web application, built with Next.js 15, lets users easily add songs to your Spotify queue.

## Getting Started

Here's how to set up the Spotify Queue App:

### Prerequisites

Before you begin, ensure you have the following installed and accounts created:

- **Node.js:** Version 20 or later.
- **Yarn:** A package manager.
- **PostgreSQL:** A database for Prisma.
- **Spotify Developer Account:** Required for Spotify API access.
- **Discord Account:** Required for Discord integration.

### Installation

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/xlittlej/spotify-queue-app.git
    ```

2.  **Install Dependencies:**

    ```bash
    yarn install
    ```

3.  **Configure Environment Variables:**

    - Copy the `.env.example` file to `.env` in the project's root directory.
    - Open the `.env` file and fill in the following environment variables with your specific credentials and settings:

      - `SPOTIFY_CLIENT_ID`: Obtained from your Spotify Developer Dashboard.
      - `SPOTIFY_CLIENT_SECRET`: Obtained from your Spotify Developer Dashboard.
      - `SPOTIFY_USER_ID`: Your Spotify user ID.
      - `SPOTIFY_REDIRECT_URI`: The redirect URI for your Spotify application (default: `/api/spotify/callback`). **Important:** This URI must be whitelisted in your Spotify Developer Dashboard (e.g., `https://yourdomain.com/api/discord/callback`) (As well as `http://localhost:3000/api/spotify/callback`).
      - `DISCORD_CLIENT_ID`: Obtained from the Discord Developer Portal.
      - `DISCORD_CLIENT_SECRET`: Obtained from the Discord Developer Portal.
      - `DISCORD_REDIRECT_URI`: The redirect URI for your Discord application (default: `/api/discord/callback`). **Important:** This URI must be whitelisted in your Discord Developer Portal (e.g., `https://yourdomain.com/api/discord/callback`).
      - `DISCORD_BOT_TOKEN`: The token for your Discord bot.
      - `DISCORD_QUEUE_LOGS_CHANNEL_ID`: The ID of the Discord channel where queue logs will be sent. (Optional)
      - `DISCORD_DEVELOPER_ID`: Your Discord user ID.
      - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Obtained from Cloudflare Turnstile.
      - `TURNSTILE_SECRET_KEY`: Obtained from Cloudflare Turnstile.
      - `JWT_SECRET_KEY`: A secret key for JWT signing. Generate this using: `yarn jwt`
      - `JWT_ENCRYPTION_KEY`: An encryption key for JWT. Generate this using: `yarn jwt`
      - `DOMAIN`: Your domain (e.g., `https://yourdomain.com`)
      - `BANNED_WORDS`: A comma-separated list of banned words in track names. (Optional)
      - `DATABASE_URL`: The connection string for your PostgreSQL database (e.g., `postgresql://user:password@host:port/database?schema=public`).

4.  **Setup Prisma**

    ```bash
    npx prisma generate && npx prisma db push
    ```

### Running the Application

**Development:**

1.  Start the development server:

    ```bash
    yarn dev
    ```

2.  Open your browser and navigate to `http://localhost:3000` to view the application.

3.  Authorise Spotify: `http://localhost:3000/api/spotify/login`

**Production:**

1.  Build the application:

    ```bash
    yarn build
    ```

2.  Start the production server:

    ```bash
    yarn start
    ```
