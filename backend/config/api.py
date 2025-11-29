from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse

@api_view(['GET'])
def api_root(request, format=None):
    """
    API root endpoint that lists all available endpoints
    """
    return Response({
        'auth': {
            'login': reverse('token_obtain_pair', request=request, format=format),
            'refresh': reverse('token_refresh', request=request, format=format),
            'verify': reverse('token_verify', request=request, format=format),
            'current_user': reverse('current-user', request=request, format=format),
        },
        'cvs': reverse('cv-list', request=request, format=format),
        # Add more endpoints as needed
    })
