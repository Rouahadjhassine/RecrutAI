#!/bin/bash
set -e

# Fonction pour afficher des messages avec horodatage
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Vérification des variables d'environnement requises
check_required_vars() {
    local required_vars=("DB_NAME" "DB_USER" "DB_PASSWORD" "DB_HOST" "DB_PORT")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log "Erreur: Les variables d'environnement suivantes sont requises mais non définies:"
        for var in "${missing_vars[@]}"; do
            log "  - $var"
        done
        exit 1
    fi
}

# Vérification des dépendances
check_dependencies() {
    log "Vérification des dépendances..."
    command -v python >/dev/null 2>&1 || { log "Erreur: Python n'est pas installé"; exit 1; }
    command -v pip >/dev/null 2>&1 || { log "Erreur: pip n'est pas installé"; exit 1; }
}

# Attente de la base de données PostgreSQL
wait_for_postgres() {
    local max_retries=50  # Increased from 30 to 50
    local retry_count=0
    local delay=2  # Start with 2 seconds delay, will increase with each retry

    log "En attente de PostgreSQL sur ${DB_HOST}:${DB_PORT}..."

    while [ $retry_count -lt $max_retries ]; do
        # Try connecting using Python, which we know works
        if python -c "
import os, sys, psycopg2
from time import sleep

try:
    conn = psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        host=os.environ['DB_HOST'],
        port=os.environ.get('DB_PORT', '5432')
    )
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f'Connection failed: {str(e)}', file=sys.stderr)
    sys.exit(1)
" >/dev/null 2>&1; then
            log "✅ Connexion à PostgreSQL réussie"
            return 0
        fi

        retry_count=$((retry_count + 1))
        log "⏳ Tentative de connexion à PostgreSQL (${retry_count}/${max_retries}). Prochaine tentative dans ${delay}s..."
        sleep $delay
        
        # Increase delay up to a maximum of 10 seconds
        delay=$((delay < 10 ? delay + 1 : 10))
    done

    log "❌ ERREUR: Impossible de se connecter à PostgreSQL après ${max_retries} tentatives"
    log "Vérifiez que:"
    log "1. Le conteneur PostgreSQL est en cours d'exécution"
    log "2. Les identifiants de la base de données sont corrects"
    log "3. Le réseau Docker est correctement configuré"
    log "4. Le port ${DB_PORT} est accessible depuis le conteneur backend"
    exit 1
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
    # Vérifier les variables d'environnement requises
    check_required_vars

    # Vérifier les dépendances
    check_dependencies

    # Attendre que PostgreSQL soit prêt
    wait_for_postgres

    # Appliquer les migrations
    run_migrations

    # Collecter les fichiers statiques
    collect_static

    # Créer un superutilisateur si nécessaire
    create_superuser

    # Démarrer le serveur
    start_server
}

# Exécution du script principal
main "$@"