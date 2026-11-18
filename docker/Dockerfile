FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# nodemon não é usado em produção; evita instalar dependências de desenvolvimento.
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
