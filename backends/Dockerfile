FROM node:20-alpine

WORKDIR /app

# Longer retries help when registry.npmjs.org is slow or flaky inside Docker builds.
RUN npm config set fetch-retries 10 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 180000 \
  && npm config set fetch-timeout 600000

COPY package.json ./

RUN npm install --omit=dev --no-audit --no-fund \
  || (sleep 5 && npm install --omit=dev --no-audit --no-fund) \
  || (sleep 10 && npm install --omit=dev --no-audit --no-fund)

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/server.js"]
