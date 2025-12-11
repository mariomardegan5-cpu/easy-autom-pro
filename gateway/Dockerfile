FROM node:20-alpine

# Instalar git (necessário para dependências do Baileys)
RUN apk add --no-cache git

WORKDIR /app

# Copiar arquivos
COPY .  .

# Entrar na pasta gateway
WORKDIR /app/gateway

# Instalar dependências
RUN npm install --legacy-peer-deps

# Expor porta
EXPOSE 3000

# Rodar
CMD ["npm", "start"]
