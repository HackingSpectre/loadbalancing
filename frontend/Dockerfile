# Build stage
FROM node:20-alpine AS build
WORKDIR /app

RUN npm config set fetch-retries 10 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 180000 \
  && npm config set fetch-timeout 600000

COPY package.json ./
RUN npm install --no-audit --no-fund \
  || (sleep 5 && npm install --no-audit --no-fund) \
  || (sleep 10 && npm install --no-audit --no-fund)

COPY . .
ARG VITE_API_BASE_URL=http://localhost:8090
ARG VITE_WS_URL=ws://localhost:8090/ws
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build

# Serve static assets
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
