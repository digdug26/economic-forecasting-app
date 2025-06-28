# Codex Environment Setup Example

This document provides an example setup script along with the environment variable names and secret variable names used when running the Codex CLI for this project.

## Setup Script

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- Node 22 via nvm -------------------------------------------------
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 22 --latest-npm
nvm alias default 22
nvm use 22
node -v
npm -v

# --- npm registry & proxy hygiene -----------------------------------
npm config set registry https://registry.npmjs.org/
npm config delete http-proxy https-proxy || true

# --- Dependencies ----------------------------------------------------
npm ci --no-audit --progress=false
echo "=== node_modules ready ==="

# --- Any env vars you need for tests --------------------------------
export REACT_APP_SUPABASE_URL="dummy"
export REACT_APP_SUPABASE_ANON_KEY="dummy"
```

## Environment Variables

The Codex environment relies on the following environment variables:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Optional variables that may also be present:

- `REACT_APP_SUPABASE_SERVICE_ROLE_KEY`
- `REACT_APP_NEWS_API_KEY`
- `REACT_APP_GUARDIAN_API_KEY`
- `REACT_APP_NYT_API_KEY`
- `REACT_APP_SITE_URL` or `NEXT_PUBLIC_SITE_URL`
- `REACT_APP_RESET_DOMAIN`
- `INVITE_REDIRECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Secret Variables

When running Codex, GitHub Actions supplies the following secret:

- `OPENAI_API_KEY`

Additional secrets may be added as required.
