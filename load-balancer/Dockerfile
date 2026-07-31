FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV LB_HOST=0.0.0.0
ENV LB_PORT=8080
ENV API_HOST=0.0.0.0
ENV API_PORT=8090

EXPOSE 8080 8090

CMD ["node", "src/index.js"]
