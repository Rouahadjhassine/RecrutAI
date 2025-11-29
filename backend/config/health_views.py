# backend/config/health_views.py
"""
Health check endpoint for monitoring
"""
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import redis
import os


def health_check(request):
    """
    Health check endpoint
    Returns 200 if all services are healthy
    """
    health_status = {
        "status": "healthy",
        "services": {}
    }
    
    overall_healthy = True
    
    # Check Database
    try:
        connection.ensure_connection()
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        overall_healthy = False
    
    # Check Redis
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            health_status["services"]["redis"] = "healthy"
        else:
            health_status["services"]["redis"] = "unhealthy: cache test failed"
            overall_healthy = False
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        overall_healthy = False
    
    # Overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
        return JsonResponse(health_status, status=503)
    
    return JsonResponse(health_status, status=200)


def liveness_check(request):
    """
    Simple liveness check - just returns 200 OK
    """
    return JsonResponse({"status": "alive"}, status=200)


def readiness_check(request):
    """
    Readiness check - checks if app is ready to serve traffic
    """
    return JsonResponse({"status": "ready"}, status=200)