# Étape de construction
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (y compris les devDependencies)
RUN npm install
# Installer les dépendances de développement nécessaires
RUN npm install --save-dev react-app-rewired customize-cra

# Copier le reste du code source
COPY . .

# Construire l'application
RUN npm run build

# Étape d'exécution
FROM nginx:alpine

# Copier les fichiers de construction depuis l'étape de construction
COPY --from=builder /app/build /usr/share/nginx/html

# La configuration Nginx est gérée par le service nginx séparé

# Créer les dossiers nécessaires
RUN mkdir -p /app/staticfiles /app/media

# Exposer le port 8080
EXPOSE 8080

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]