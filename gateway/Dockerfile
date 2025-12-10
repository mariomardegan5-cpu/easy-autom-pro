FROM node:20-alpine

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
