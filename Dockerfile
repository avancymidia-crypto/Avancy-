# Imagem de produção do app Avancy.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# As dependências vêm primeiro para aproveitar o cache de camadas: só
# reinstala quando o package.json ou o lock mudam.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY public ./public

# Não roda como root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
