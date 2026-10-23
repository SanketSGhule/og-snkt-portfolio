# OG.SNKT — Creative Portfolio

<div align="center">

![OG.SNKT Banner](https://raw.githubusercontent.com/SanketSGhule/og-snkt-portfolio/main/public/images/avatar.jpg)

**Dual-Personality Creative Showcase & Visual Arts Experience**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-og--snkt--portfolio.vercel.app-black?style=for-the-badge&logo=vercel)](https://og-snkt-portfolio.vercel.app)
[![Version](https://img.shields.io/badge/Release-v3.3-crimson?style=for-the-badge)](https://github.com/SanketSGhule/og-snkt-portfolio/releases)
[![Status](https://img.shields.io/badge/Status-Active%20Production-success?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)]()

[Explore Live Website ↗](https://og-snkt-portfolio.vercel.app) • [View Changelog ↗](#-complete-version-changelog) • [Admin System ↗](#-admin-cms--cloud-sync)

</div>

---

## 🌐 Live Website

- **Production URL**: [https://og-snkt-portfolio.vercel.app](https://og-snkt-portfolio.vercel.app)
- **Deployment Platform**: Vercel Edge Network
- **Mobile Responsive**: Fully optimized for iOS, Android, tablets, and ultrawide desktop monitors

---

## ⚡ Project Overview

**OG.SNKT** is a cutting-edge personal creative portfolio engineered to showcase high-impact visual design, 3D motion, cinematic video editing, brand identity, and experimental art. 

Built around a **dual-personality aesthetic**, the portfolio allows visitors to switch seamlessly between **Side A (Editorial Minimal)** and **Side B (Cyberpunk Overdrive)**, or browse the entire catalog under **Side ALL**.

---

## ✨ Key Features

### 1. 🎛️ Interactive Cassette Switcher (Side A / Side B / Side ALL)
- **Side A (Editorial Minimal)**: Timeless Swiss typographic layout, high-contrast monochrome tones, luxury frosted glass, and refined editorial spacing.
- **Side B (Cyberpunk Overdrive)**: Neon cyan/magenta accents, tactile HUD viewfinders, scanline overlays, glitch motion triggers, and raw creative energy.
- **Side ALL**: Unified archive bringing together every dimension of the artist's work into a seamless masonry grid.
- **Tactile Sound Effects**: Custom mechanical cassette switch click audio accompanying real-time theme transitions.

### 2. 📐 Dual-Ratio Dynamic Aspect Ratio Morphing (v3.0)
- **Resting Ratio**: Video tiles adapt to custom uploaded thumbnail pixel aspect ratios (e.g. 1:1 square, 4:5 vertical, or 16:9 cinematic).
- **Interactive Morph**: On hover (desktop) or touch-and-hold (mobile), the tile smoothly morphs and scales to match the source video's native pixel ratio.
- **Zero Layout Shift**: Seamless CSS transitions ensure no jarring shifts or cutoffs in masonry layout flow.

### 3. 🔊 Intelligent Dual-Tier Sound Architecture (v3.2 & v3.3)
- **Card Preview Sound (40% Volume)**: Hovering over a video tile on desktop or holding it on mobile plays smooth live video with audio balanced at a comfortable **40% volume**.
- **Cinema Lightbox Sound (60% Volume)**: Clicking any video opens a distraction-free full-screen cinema viewer (GLightbox + Plyr) set to an optimal default **60% volume**.
- **Mutual Exclusivity & Auto-Pause**: Only one preview plays at any given instant. Moving the mouse away or releasing touch immediately silences and resets preview audio.

### 4. ☀️ Luxury Light Mode & High-Contrast Dark Mode (v3.1)
- **Light Theme**: Polished obsidian typography gradients, frosted white translucent navigation bar, high-contrast category filter pills, subtle atmospheric grid mesh, and luminous HUD badges.
- **Dark Theme**: Deep abyss blacks, neon glows, glowing borders, and high-impact cybernetic contrast.

### 5. 🛠️ Comprehensive Admin CMS & Cloud Sync
- **Secure Authentication**: Protected admin access using session-based authentication and private environment variables.
- **Direct Cloud & Local Uploads**: Upload high-resolution images, GIFs, and MP4/WebM videos directly from desktop or mobile camera roll.
- **Custom Thumbnail Uploader**: Upload dedicated thumbnail artwork for any video card.
- **SortableJS Drag-and-Drop**: Visually reorder gallery items with instantaneous drag-and-drop handles.
- **GitHub REST API Auto-Sync**: Changes made via the admin studio are automatically committed and pushed directly to the GitHub repository.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Core Frontend** | HTML5, Modern Vanilla JavaScript (ES6+), CSS3 (CSS Variables, Flexbox, CSS Grid) |
| **Animation & Motion** | [GSAP (GreenSock)](https://greensock.com/), [ScrollTrigger](https://greensock.com/scrolltrigger/), SortableJS, Canvas Confetti |
| **Media & Lightbox** | [GLightbox](https://biati-digital.github.io/glightbox/), [Plyr.io](https://plyr.io/) HTML5 Player, Native HTML5 Video & Audio APIs |
| **Backend & Cloud** | Node.js, Express.js, sql.js (SQLite), Multer, Sharp (Image Processing) |
| **Cloud Synchronization** | GitHub REST API v3, Cloudinary CDN |
| **Deployment & Hosting** | [Vercel](https://vercel.com/) (Edge CDN), Docker, Render.com |

---

## 📜 Complete Version Changelog

### **v3.3 — Interactive Preview Audio Engine** *(Current)*
- 🔊 **40% Preview Audio**: Enabled live audio playback during desktop hover and mobile touch-and-hold video previews at an optimal 40% volume.
- 🛑 **Mutual Exclusivity**: Automatic pausing and silencing of any active tile preview when moving to another item.
- 📱 **Mobile Touch-and-Hold Sound**: Synchronized audio playback with mobile long-press video preview gestures.

### **v3.2 — Standardized Cinema Player Sound**
- 🎧 **60% Player Volume**: Configured GLightbox and Plyr full-screen video players to open with a default volume of 60% for consistent listening comfort.
- 🔄 **Volume State Persistence**: Retained user volume adjustments during navigation across multi-asset gallery lightbox items.

### **v3.1 — Luxury Light Mode Contrast & Harmony Overhaul**
- 🎨 **Frosted Glass Navigation**: Converted dark navigation pill in light mode into a frosted translucent white surface (`rgba(255, 255, 255, 0.85)`) with crisp obsidian text and icons.
- 🏷️ **Adaptive Filter Bar**: Restyled all category pills (`All`, `Videos`, `Images`, etc.) to provide crisp dark borders and contrast against light backgrounds.
- 🎯 **Tactile HUD Badges**: Light mode viewfinders, tag badges, and corner brackets updated with dark obsidian tones to eliminate faded contrast.
- 🎬 **Transition Shutter Harmony**: Replaced harsh black mode-transition shutter overlays with dynamic color-matched blurs during light mode switching.

### **v3.0 — Custom Thumbnail Upload & Dual-Ratio Morphing**
- 🖼️ **Thumbnail Uploader**: Added an optional thumbnail upload field in the Admin Studio for video projects.
- 📐 **Dual-Ratio Scaling**: Video tiles render at their thumbnail's natural aspect ratio at rest, and smoothly morph to the video's native ratio upon hover or touch.
- 🗄️ **GitHub Schema Sync**: Updated cloud data pipeline to store both media URL and thumbnail URL attributes cleanly in `data/portfolio.json`.

### **v2.9 — Video Frame Performance Optimization**
- ⚡ **Native Fragment Previews**: Optimized video loading through fragment caching and on-demand streaming to minimize mobile bandwidth usage.
- 📱 **Haptic Long-Press Detection**: Fine-tuned touch event listeners for instant video preview playback on mobile devices.

### **v2.8 — Luxury Light Mode Introduction**
- 💎 **Platinum & Obsidian Palette**: Introduced a clean, high-fashion editorial light theme.
- 🌫️ **Ambient Glowing Mesh**: Added dynamic gradient mesh backgrounds responsive to scroll position.
- ✨ **Frosted Card Treatments**: Implemented backdrop-blur glass panels across portfolio cards and modals.

### **v2.5 — Interactive Cassette Switcher**
- 📼 **Skeuomorphic Cassette Interface**: Built a retro-tactile audio cassette switch controller in the navigation bar.
- 🔊 **Mechanical Audio FX**: Added tactile audio clicks when cycling through Side A, Side B, and Side ALL.
- ⚡ **Dynamic Visual Shutter**: Added animated transition shutter effect during personality swaps.

### **v2.0 — Mobile Upload Engine & Cloud Sync**
- 📲 **Mobile Admin Interface**: Designed a responsive touch-first management view for uploading directly from mobile browsers.
- ☁️ **GitHub REST API Pipeline**: Integrated automated Git commits and pushes directly from the CMS dashboard.
- 🔀 **SortableJS Reordering**: Added fluid drag-and-drop handles for visual re-sequencing of the portfolio feed.

### **v1.0 — Initial Creative Portfolio Launch**
- 🚀 **Initial Architecture**: Dual Side A (Minimal) and Side B (Cyberpunk) concept launch.
- 🧱 **Masonry Grid**: Fluid multi-column masonry gallery layout with responsive breakpoints.
- 🗄️ **Express & SQLite Backend**: Local Node.js server with file uploads and database storage.
- 🎨 **GLightbox Showcase**: High-resolution image inspection and video playback modals.

---

## 🔒 Security & Privacy Notice

> [!IMPORTANT]
> **Admin credentials, session tokens, and cloud API keys are strictly secured.**
> 
> - Admin access is gated behind session-based authentication using environment variables (`ADMIN_PASSWORD`).
> - No plaintext passwords, authentication hashes, or private tokens are stored in the public source code, commit history, or documentation.
> - For production deployments, all secrets must be set via your hosting provider's private Environment Variables settings (e.g. Vercel Dashboard, Render Environment).

---

## 💻 Local Setup & Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/SanketSGhule/og-snkt-portfolio.git
   cd og-snkt-portfolio
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   ADMIN_PASSWORD=your_secure_password_here
   SESSION_SECRET=your_random_session_secret_key_here
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   # or for standard start:
   npm start
   ```

5. **Open in Browser**:
   - Main Portfolio: [http://localhost:3000](http://localhost:3000)
   - Admin Studio: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🚀 Deployment

### Deploying to Vercel (Recommended)
This repository is pre-configured with `vercel.json` for rapid static & serverless edge hosting:
1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Set your environment variables in the Vercel Project Settings.
3. Click **Deploy** — your portfolio is live in seconds with worldwide CDN distribution.

### Deploying with Docker / VPS / Render
A production-ready `Dockerfile` and `render.yaml` are included:
```bash
docker build -t ogsnkt-portfolio .
docker run -d -p 3000:3000 --name portfolio ogsnkt-portfolio
```

---

## 👤 Author

**Sanket Ghule**
- Website: [og-snkt-portfolio.vercel.app](https://og-snkt-portfolio.vercel.app)
- GitHub: [@SanketSGhule](https://github.com/SanketSGhule)

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
