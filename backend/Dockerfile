# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install backend deps
COPY backend/package.json backend/package-lock.json* ./ 
RUN npm install --only=production

# Copy backend source
COPY backend/ ./

ENV NODE_ENV=production
ENV PORT=55000

EXPOSE 55000

CMD ["npm", "start"]