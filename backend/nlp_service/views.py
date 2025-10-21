from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .analyzer import CVAnalyzer

class AnalyzeCVView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Analyser compatibilité CV vs Job Offer"""
        cv_id = request.data.get('cv_id')
        job_offer_id = request.data.get('job_offer_id')
        
        cv = CV.objects.get(id=cv_id)
        job_offer = JobOffer.objects.get(id=job_offer_id)
        
        analyzer = CVAnalyzer()
        score = analyzer.calculate_compatibility(cv.extracted_text, job_offer.description)
        keywords = analyzer.extract_keywords(cv.extracted_text, job_offer.description)
        
        result = AnalysisResult.objects.create(
            cv=cv,
            job_offer=job_offer,
            compatibility_score=score,
            matched_keywords=keywords
        )
        
        return Response({'score': score, 'keywords': keywords})

class RankCVsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Classer plusieurs CVs"""
        job_offer_id = request.data.get('job_offer_id')
        job_offer = JobOffer.objects.get(id=job_offer_id)
        
        cvs = CV.objects.all()
        analyzer = CVAnalyzer()
        
        rankings = analyzer.rank_cvs(
            [cv.extracted_text for cv in cvs],
            job_offer.description
        )
        
        return Response({'rankings': rankings})

class SummarizeCVView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, cv_id):
        """Résumer un CV"""
        cv = CV.objects.get(id=cv_id)
        # Utiliser transformers (HuggingFace) pour résumé
        # ou extractive summarization
        summary = self._summarize(cv.extracted_text)
        return Response({'summary': summary})