# Dockerfile.frontend
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Allow the backend API base URL to be provided at build time so that
# Docker Compose can point the frontend at the "backend" service.
ARG REACT_APP_API_BASE
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}

RUN npm run build

FROM nginx:1.27-alpine

# Upgrade Alpine system packages and vulnerable libraries
RUN apk update && apk upgrade && apk add --upgrade libpng libxml2

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]