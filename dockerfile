# ------------ Stage 1: Build ------------
FROM node:20-slim AS build

WORKDIR /app

# Install required tools
RUN apt update && apt-get install -y openssl && \
    apt clean && rm -rf /var/lib/apt/lists/*

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy source code and Prisma schema
COPY prisma ./prisma
COPY ./src ./src

# Generate Prisma Client
RUN npx prisma generate


# ------------ Stage 2: Runtime ------------
FROM node:20-slim AS runtime

WORKDIR /app

# Install required tools: add Python + venv support + utilities
RUN apt update && apt-get install -y \
    openssl \
    python3 \
    python3-venv \
    python3-pip \
    webp \
    poppler-utils \
    curl && \
    apt clean && rm -rf /var/lib/apt/lists/*

# Create and activate Python virtual environment
RUN python3 -m venv /app/.venv && \
    /app/.venv/bin/pip install --no-cache-dir --upgrade pip && \
    /app/.venv/bin/pip install --no-cache-dir pymupdf

# Copy only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled source + Prisma Client
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
# Set up directories
RUN mkdir -p /pdfs /thumbnails && \
    chown -R node /pdfs /thumbnails

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh 

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"

USER node

# Expose and set entrypoint
EXPOSE 3001
ENTRYPOINT [ "/app/entrypoint.sh" ]
