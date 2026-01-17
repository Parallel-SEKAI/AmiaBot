# AmiaBot

## Project Overview

AmiaBot is a versatile, plugin-based chatbot built with TypeScript and designed to work with the OneBot standard. It supports a wide range of features through a modular architecture, allowing for easy extension and customization. The bot integrates with various external services, including GitHub, OpenAI, and Netease Cloud Music, and utilizes a PostgreSQL database for data persistence.

**Key Technologies:**

*   **Language:** TypeScript
*   **Framework:** None (custom plugin-based architecture)
*   **Chat Standard:** OneBot
*   **Database:** PostgreSQL
*   **Key Libraries:**
    *   `onebot-client`: For communicating with OneBot-compatible chat platforms.
    *   `pg`: For interacting with the PostgreSQL database.
    *   `openai`: For integrating with OpenAI's API.
    *   `octokit`: For interacting with the GitHub API.
    *   `dotenv`: For managing environment variables.
    *   `zod`: for schema validation of environment variables.
    *   `winston`: for logging.

**Architecture:**

The bot's architecture is centered around a `FeatureManager` that dynamically loads and initializes various features. Each feature is a self-contained module that can register its own commands and event listeners. This makes the bot highly extensible and easy to maintain.

**Features:**

*   **Chat:** Core chat functionalities.
*   **AI Integration:** Powered by OpenAI's Gemini for advanced conversations.
*   **GitHub Integration:** Fetch information from GitHub repositories, issues, and pull requests.
*   **Music:** Integrates with Netease Cloud Music to fetch song information and lyrics.
*   **Games:** Includes guessing games for cards, songs, and events.
*   **Utilities:** Provides features like comic search, message statistics, and auto-recall.
*   **And more...**

## Building and Running

### Prerequisites

*   Node.js
*   npm
*   Docker (for running the database)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/example/amiabot.git
    cd amiabot
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

1.  Create a `.env` file by copying the example:
    ```bash
    cp .env.example .env
    ```
2.  Edit the `.env` file with your specific configuration, including:
    *   Database credentials
    *   OneBot connection details
    *   API keys for OpenAI, GitHub, etc.

### Running the Bot

**Development Mode (with hot-reloading):**

```bash
npm run dev
```

**Production Mode:**

1.  Build the TypeScript code:
    ```bash
    npm run build
    ```
2.  Start the bot:
    ```bash
    npm run start
    ```

### Testing

There are no pre-configured tests for this project.

## Development Conventions

*   **Code Style:** The project uses Prettier for code formatting. You can format the code using:
    ```bash
    npm run format
    ```
*   **Commits:** (No explicit commit conventions found, but it is recommended to follow conventional commit standards).
*   **Branching:** (No explicit branching strategy found, but it is recommended to use a feature-branch workflow).
*   **Adding new features:** New features should be created as separate modules in the `src/features` directory and registered in `src/features/index.ts`.

## Implementation Logic

*   **Plugin System:** Uses `FeatureManager` to dynamically load features from `src/features`.
*   **OneBot Integration:** Communicates via HTTP and WebSocket. Supports NapCat's **Stream API** for efficient file uploads (replacing legacy Base64 methods).
*   **File Handling:** Large files (video, audio, generated images) are uploaded using `upload_file_stream` in chunks (64KB) to minimize request size and memory overhead.
*   **Automatic Streaming:** `SendMessage.send()` automatically detects `Buffer` data in message segments and performs streaming uploads before delivery.

## Current Status (Features)

- [x] **Core:** OneBot client, command registration, event handling.
- [x] **Stream API Integration:** Optimized file handling using NapCat's streaming upload.
- [x] **Bilibili:** Video info fetching and streaming video upload.
- [x] **Guess Song:** Music clipping and streaming audio playback.
- [x] **Enana UI:** Dynamic image generation (now leveraging streaming uploads).
- [ ] **State Persistence:** Audit and implement robust state-saving for plugin states.

