# Route Matrix

This document maps out the key routes and their initial client boundaries and data dependencies.

## Public Routes
- `/`: Home page (static landing content, environment payload)
- `/albums`: Albums archive (public album summaries, static dictionaries)
- `/albums/[id]`: Album detail (public/private album metadata, media query, engagement summary, locked state)
- `/games`: Games list
- `/about`: About profile (site settings, static content)
- `/contact`: Contact form

## Authenticated/Protected Routes
- `/profile`: User preferences and settings
- `/studio/*`: Admin dashboard and management (auth required, private data)

## Heavy Component Dependencies
- `PublicDepthEnvironment`: Used globally, loads Three.js and R3F
- `AssistantPanel`: Used globally for characters
- `MediaViewer`: Used in `/albums/[id]` for viewing photos
