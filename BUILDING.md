Docker buildx multi-arch instructions

This project supports building multi-architecture Docker images (linux/amd64 and linux/arm64) using Docker Buildx.

Prerequisites
- Docker 20.10+ with Buildx enabled (most modern Docker Desktop versions include it).
- Access to your container registry (logged in with `docker login`).

Create and use a buildx builder (one-time):

```bash
# create a builder and set it as default (safe if it already exists)
npm run docker:buildx:create
```

Build and push a multi-arch image for both amd64 and arm64 (recommended):

```bash
npm run docker:buildx:build
```

Notes:
- The `docker:buildx:build` script builds for `linux/amd64,linux/arm64` and pushes the resulting multi-platform manifest to the registry. Use this when you want a single image tag that works for Intel and Apple Silicon hosts.
- If you'd rather produce a locally-loadable image for your current host architecture, use the convenience script `docker:buildx:build-local`. It attempts to map your `uname -m` to a buildx platform and uses `--load` (which only works for single-platform builds).

Troubleshooting
- If your host is Apple Silicon (arm64) and you want to run an amd64 image locally, you can add `platform: linux/amd64` to the service in `docker-compose.yml` or run with emulation, but prefer building a multi-arch image instead.
- If buildx fails due to driver or qemu setup, try resetting buildx: `docker buildx rm recipes-builder || true` then `npm run docker:buildx:create`.

Examples

Build and push multi-arch image:

```bash
# ensure you're logged in
docker login home.shotton.us:5443
npm run docker:buildx:create
npm run docker:buildx:build
```

Build a single-arch local image (no push):

```bash
npm run docker:buildx:build-local
```
