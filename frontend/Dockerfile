FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Vite needs --host to bind to 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host"]
