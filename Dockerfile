FROM node:26-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN python3 -m venv backend/.venv && backend/.venv/bin/pip install --no-cache-dir -r backend/requirements.txt && npm run build
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production
ENV AGRO_DATA_DIR=/data
EXPOSE 3000
USER node
CMD ["node", "scripts/start.mjs", "--production"]
