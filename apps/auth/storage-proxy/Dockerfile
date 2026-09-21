FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json ./
COPY server.js ./

# No npm install needed - we use only Node.js built-in modules

USER node

EXPOSE 3001

CMD ["node", "server.js"]
