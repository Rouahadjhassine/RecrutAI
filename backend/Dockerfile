FROM python:3.10-slim

# Set environment variables for caching
ENV TRANSFORMERS_CACHE=/home/appuser/.cache/huggingface/hub
ENV XDG_CACHE_HOME=/home/appuser/.cache
ENV SPACY_DATA=/usr/local/lib/python3.10/site-packages/spacy/data

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    gfortran \
    libgomp1 \
    netcat-openbsd \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with specific UID/GID
RUN groupadd -g 1000 appuser && \
    useradd -r -u 1000 -g appuser appuser

# Copy requirements and constraints
COPY requirements.txt .
COPY constraints.txt .

# Install PyTorch CPU with constraints
RUN pip install --no-cache-dir \
    --constraint constraints.txt \
    torch==2.0.1 \
    torchvision==0.15.2 \
    torchaudio==2.0.2 \
    --index-url https://download.pytorch.org/whl/cpu

# Install spaCy and NLP packages with constraints
RUN pip install --no-cache-dir \
    --constraint constraints.txt \
    spacy==3.7.2 \
    sentence-transformers==2.2.2 \
    transformers==4.30.2 \
    huggingface-hub==0.16.4

# Install remaining requirements with constraints
RUN pip install --no-cache-dir \
    --constraint constraints.txt \
    -r requirements.txt

# Install spaCy French model using pip
RUN pip install https://github.com/explosion/spacy-models/releases/download/fr_core_news_md-3.7.0/fr_core_news_md-3.7.0.tar.gz && \
    python -m spacy link fr_core_news_md fr && \
    mkdir -p /home/appuser/.cache/huggingface/hub && \
    mkdir -p /app/models && \
    chown -R appuser:appuser /home/appuser/.cache /app/models

# Copy full project
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/staticfiles /app/media /app/data && \
    chown -R appuser:appuser /app

# Set env variables
ENV PYTHONPATH=/app
ENV MODEL_DIR=/app/models
ENV DATA_DIR=/app/data
ENV PYTHONUNBUFFERED=1

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    chown appuser:appuser /docker-entrypoint.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Use entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]