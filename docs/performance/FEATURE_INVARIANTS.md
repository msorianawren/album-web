# Feature Invariants

This document lists the absolute invariants that must be preserved during the performance and architecture refactoring.

## Routes & Capabilities
- Home, Albums, Games, About, Contact, Profile, and Studio
- Public, updating, and private albums

## Features
- Google authentication
- Private album access requests
- Wren Feathers purchases and ledger behavior
- Likes, comments, and downloads
- Album and media view tracking
- Media viewer and keyboard/touch navigation
- Image and video uploads
- R2 public and private delivery
- Admin CRUD and processing workflows

## Environments & UI
- Six environment presets
- Day, Sunset, and Night states
- Auto time mode
- 3D botanical environments
- Wind chimes, wind physics, and sound
- Assistant modes and assistant characters
- English and Vietnamese localization
- Existing mobile and desktop layouts

## Security
- Existing security, RLS, and audit logging behavior
- Private assets must not be exposed

## UI Preservation
- Do not improve scores by deleting visual effects, reducing functionality, exposing private assets, changing permissions, or visibly lowering image quality.
