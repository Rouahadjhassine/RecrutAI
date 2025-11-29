FROM nginx:alpine

# Supprimer toutes les configurations par défaut
RUN rm -rf /etc/nginx/conf.d/*
RUN rm -f /etc/nginx/conf.d/default.conf

# Créer le dossier pour les logs et la configuration
RUN mkdir -p /var/log/nginx /etc/nginx/conf.d

# Copier notre configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types

# Donner les bonnes permissions
RUN chown -R nginx:nginx /var/log/nginx /var/cache/nginx /etc/nginx
RUN chmod -R 755 /var/log/nginx

# Créer un fichier de configuration vide pour éviter les avertissements
RUN touch /etc/nginx/conf.d/app.conf

# Copier le script de démarrage
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

# Utiliser le script de démarrage personnalisé
ENTRYPOINT ["/docker-entrypoint.sh"]

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]