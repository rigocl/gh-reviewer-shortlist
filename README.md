# GitHub Reviewer Favorites

A Chrome extension that adds a persistent **Favorites** section to GitHub's PR reviewer dropdown. Pin the teammates you review with most so they're always one click away — no searching required.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)

## The Problem

When creating a pull request on GitHub, adding reviewers means opening the dropdown, waiting for suggestions to load, and searching for names. If you work on a scrum team, you're adding the same 2-5 people every time.

## The Solution

This extension injects a **Favorites** section at the top of GitHub's reviewer dropdown. Star the reviewers you work with, and they'll always be right there when you open the dropdown — across all repos, all PRs.

## Features

- **Star reviewers** directly from GitHub's reviewer dropdown
- **Favorites section** appears at the top of the dropdown, above Suggestions
- **One click to assign** — click a favorite to check/uncheck them as a reviewer
- **Synced across devices** via Chrome's sync storage
- **Alphabetically sorted** favorites
- **Manage from popup** — click the extension icon to view/remove favorites
- **Zero config** — just install and start starring

## Install

### From release zip

1. Download the latest `.zip` from [Releases](../../releases)
2. Unzip to a folder on your machine
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (toggle in top-right)
5. Click **Load unpacked**
6. Select the unzipped folder

### From source

```bash
git clone <this-repo>
```

Then follow steps 3-6 above, pointing "Load unpacked" at the cloned directory.

## Usage

1. Open any pull request on GitHub
2. Click the **gear icon** next to Reviewers to open the dropdown
3. Click the **star** next to any reviewer to add them to your favorites
4. The **Favorites** section appears at the top of the dropdown
5. Click a favorite to assign them as a reviewer (works the same as clicking their name in the regular list)
6. Click the **extension icon** in Chrome's toolbar to manage your favorites list

## How It Works

- Content script injects into `github.com` pages
- Detects when the reviewer dropdown opens (via MutationObserver + toggle events)
- Adds star buttons to each reviewer in GitHub's list
- Favorites are stored in `chrome.storage.sync` and rendered above the filterable list so GitHub's own search/filter logic doesn't interfere
- Clicking a favorite delegates to the real reviewer item, so GitHub's native form handling takes care of the actual assignment
