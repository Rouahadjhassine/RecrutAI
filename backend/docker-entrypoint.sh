#!/bin/bash
set -e

# Fonction pour afficher des messages avec horodatage
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Vérification des dépendances
check_dependencies() {
    log "Vérification des dépendances..."
    command -v python >/dev/null 2>&1 || { log "Erreur: Python n'est pas installé"; exit 1; }
    command -v pip >/dev/null 2>&1 || { log "Erreur: pip n'est pas installé"; exit 1; }
}

# Attente de la base de données PostgreSQL
wait_for_postgres() {
    log "En attente de PostgreSQL..."
    until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' >/dev/null 2>&1; do
        log "En attente de la connexion à PostgreSQL..."
        sleep 5
    done
    log "PostgreSQL est prêt"
}

# Exécution des migrations
run_migrations() {
    log "Application des migrations..."
    python manage.py migrate --noinput
}

# Collecte des fichiers statiques
collect_static() {
    log "Collecte des fichiers statiques..."
    python manage.py collectstatic --noinput --clear
}

# Création d'un superutilisateur si nécessaire
create_superuser() {
    if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
        log "Création du superutilisateur..."
        echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')" | python manage.py shell || true
    fi
}

# Démarrer le serveur ASGI avec Daphne
start_server() {
    log "Démarrage du serveur ASGI avec Daphne..."
    exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
}

# Point d'entrée principal
main() {
    check_dependencies
    wait_for_postgres
    run_migrations
    collect_static
    create_superuser
    
    # Si aucun argument n'est passé, démarrer le serveur par défaut
    if [ "$#" -eq 0 ]; then
        start_server
    else
        # Sinon exécuter la commande passée en argument
        log "Exécution de la commande: $@"
        exec "$@"
    fi
}

# Exécution du script principal
main "$@"