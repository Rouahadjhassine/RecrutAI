from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_verified', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)
    username = serializers.CharField(required=False)  # Ne pas rendre obligatoire, sera défini automatiquement
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default='candidat')
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']
        extra_kwargs = {
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
            'email': {'required': True, 'allow_blank': False},
            'password': {'write_only': True, 'min_length': 8}
        }
    
    def validate(self, data):
        # Vérifier si l'email existe déjà
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Un utilisateur avec cet email existe déjà."})
        return data

    def create(self, validated_data):
        print("Données validées:", validated_data)
        try:
            # Utiliser l'email comme nom d'utilisateur si non fourni
            username = validated_data.get('username', validated_data['email'])
            
            user = User.objects.create_user(
                username=username,
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                role=validated_data.get('role', 'candidat')
            )
            print("Utilisateur créé avec succès:", user.email)
            return user
        except Exception as e:
            print("Erreur lors de la création de l'utilisateur:", str(e))
            raise serializers.ValidationError({"error": "Une erreur est survenue lors de la création du compte."})

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
