# Use an official Python runtime as base
FROM python:3.11-slim AS backend

# Install system dependencies for PyMuPDF (fitz) and other native libs
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt /app/backend/
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /app/backend/requirements.txt

# Install spaCy model via pip (avoids the download command bug)
RUN pip install en-core-web-sm

# Copy the rest of the backend code
COPY backend/ /app/backend/

# ----- Build frontend -----
FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
# Build the React app
RUN npm run build

# ----- Final image -----
FROM python:3.11-slim

# Install runtime dependencies (no build tools)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend from the backend stage
COPY --from=backend /app/backend /app/backend
COPY --from=backend /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend /usr/local/bin /usr/local/bin

# Copy the built frontend from the builder stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Expose port 8000
EXPOSE 8000

# Start the FastAPI app with uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]