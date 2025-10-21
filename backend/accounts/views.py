from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Inscription d'un nouvel utilisateur"""
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': 'Inscription réussie'
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'message': 'Erreur lors de l\'inscription',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Connexion d'un utilisateur"""
    serializer = LoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'message': 'Données invalides',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    
    # Vérifier si l'utilisateur existe
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            'message': 'Email ou mot de passe incorrect'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Authentifier avec le username (Django utilise username par défaut)
    user_auth = authenticate(username=user.username, password=password)
    
    if user_auth is None:
        return Response({
            'message': 'Email ou mot de passe incorrect'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Générer les tokens JWT
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'message': 'Connexion réussie'
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Récupérer l'utilisateur connecté"""
    return Response({
        'user': UserSerializer(request.user).data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Déconnexion (blacklist du token)"""
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({
            'message': 'Déconnexion réussie'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'message': 'Erreur lors de la déconnexion'
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def test_api(request):
    return Response({'message': '✅ Backend et Frontend connectés!', 'status': 'success'})
