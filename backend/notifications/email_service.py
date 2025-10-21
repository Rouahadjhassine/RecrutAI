from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string

@shared_task
def send_email_to_candidates(job_offer_id, candidate_ids):
    """Envoyer emails aux candidats sélectionnés"""
    job_offer = JobOffer.objects.get(id=job_offer_id)
    
    for candidate_id in candidate_ids:
        candidate = User.objects.get(id=candidate_id)
        
        context = {
            'candidate_name': candidate.first_name,
            'job_title': job_offer.title,
            'job_description': job_offer.description,
        }
        
        html_message = render_to_string('email/job_offer.html', context)
        
        send_mail(
            subject=f"Opportunité : {job_offer.title}",
            message="",
            from_email="no-reply@recruitment.com",
            recipient_list=[candidate.email],
            html_message=html_message,
        )

# settings.py - Configuration Celery
CELERY_BROKER_URL = 'redis://localhost:6379'
CELERY_RESULT_BACKEND = 'redis://localhost:6379'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env('EMAIL_USER')
EMAIL_HOST_PASSWORD = env('EMAIL_PASSWORD')