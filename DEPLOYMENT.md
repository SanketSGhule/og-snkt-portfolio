# OG.SNKT Portfolio — Deployment & Mobile Access Guide

This guide covers how to access the website on your mobile phone right now, as well as how to deploy it permanently to the cloud for 24/7 public access.

---

## 📱 1. Immediate Mobile Access (Local Wi-Fi)

Your Node.js server is already running and configured to accept local network connections.

### Step 1: Connect to the Same Network
Ensure your mobile phone (iPhone or Android) is connected to the same Wi-Fi / local network as this computer.

### Step 2: Open on Mobile
Open your phone's browser (Safari or Chrome) and enter:
```
http://194.100.4.18:3000
```

### Alternatively: Scan the QR Code
1. Open [http://localhost:3000/qr.html](http://localhost:3000/qr.html) on your computer (or click the mobile phone icon in the top navigation).
2. Point your phone's camera at the QR code to open the portfolio instantly!

---

## ☁️ 2. Permanent 24/7 Free Cloud Deployment (Render.com)

To make your portfolio accessible from anywhere in the world on 4G/5G and custom domains, we recommend **Render.com** (100% free tier with free SSL):

### Method A: Connect via GitHub (Automatic Updates)
1. Initialize a Git repository in `D:\portfolio` or upload this folder to your GitHub account:
   - Go to [github.com/new](https://github.com/new) and create a repository called `og-snkt-portfolio`.
   - Push your code to GitHub.
2. Go to [render.com](https://render.com) and sign up (Free).
3. Click **New +** > **Web Service**.
4. Select your `og-snkt-portfolio` repository.
5. Render will automatically detect `render.yaml` or use these settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. Add Environment Variable:
   - `ADMIN_PASSWORD`: Your desired admin password (e.g. `ogsnkt2024`)
7. Click **Create Web Service**.
8. Within 2 minutes, your live site will be deployed at `https://og-snkt-portfolio.onrender.com`!

---

## 🐳 3. Container Deployment (Railway / Fly.io / VPS)

The project includes a ready-to-run `Dockerfile`:
```bash
# Build and run Docker container locally or on any cloud
docker build -t ogsnkt-portfolio .
docker run -p 3000:3000 ogsnkt-portfolio
```
On **Railway.app** or **Fly.io**, simply link your repository or run `fly launch` / `railway up`, and it will automatically deploy using the included `Dockerfile`.
