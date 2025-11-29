#!/bin/sh
set -e

# Afficher la configuration actuelle
echo "=== Configuration Nginx actuelle ==="
cat /etc/nginx/nginx.conf
echo "==================================="

# Vérifier la configuration Nginx
echo "Vérification de la configuration Nginx..."
if ! nginx -t; then
    echo "ERREUR: La configuration Nginx est invalide"
    exit 1
fi

# Démarrer Nginx
echo "Démarrage de Nginx..."
exec nginx -g 'daemon off;'
