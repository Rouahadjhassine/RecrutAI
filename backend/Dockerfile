FROM python:3.9-slim

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
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first
COPY requirements.txt .

# Install PyTorch CPU
RUN pip install --no-cache-dir \
    torch==2.0.1 \
    torchvision==0.15.2 \
    torchaudio==2.0.2 \
    --index-url https://download.pytorch.org/whl/cpu

# Install spaCy and NLP packages
RUN pip install --no-cache-dir \
    spacy==3.7.2 \
    sentence-transformers==2.2.2 \
    transformers==4.30.2 \
    huggingface-hub==0.16.4

# Install remaining requirements
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy French model
RUN python -m spacy download fr_core_news_md

# Copy full project
COPY . .

# Set env variables
ENV PYTHONPATH=/app
ENV MODEL_DIR=/app/models
ENV DATA_DIR=/app/data

# Create necessary directories
RUN mkdir -p /app/staticfiles /app/media

# Expose port
EXPOSE 8000

# Start command (overridden in docker-compose)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]