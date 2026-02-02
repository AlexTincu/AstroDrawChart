# Folosește o imagine slim pentru a reduce dimensiunea (aprox 200MB vs 1GB+)
# Etapa 1: Build - pentru compilarea modulelor native (ex: swisseph)
FROM node:20-slim AS builder

# Instalează dependințele necesare pentru build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copiază fișierele de dependințe
COPY package*.json ./

# Instalează dependințele (excluzând devDependencies pentru a economisi spațiu)
RUN npm install --production

# Etapa 2: Runtime - Imaginea finală, mult mai mică
FROM node:20-slim

# Instalează Python 3 deoarece este menționat că este folosit de scripturi
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copiază doar node_modules compilate din etapa anterioară
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copiază restul codului aplicației
COPY . .

# Expune portul pe care ascultă aplicația
EXPOSE 3000

# Rulează aplicația
CMD ["npm", "start"]
