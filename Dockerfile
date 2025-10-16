# Multi-stage Dockerfile for Tracr API with embedded SQLite database

# Stage 1: Builder
FROM golang:1.21-alpine AS builder

# Install build dependencies for CGO and SQLite
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Set working directory
WORKDIR /build

# Copy go mod files
COPY api/go.mod api/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY api/ ./

# Build the binary with CGO enabled (required for SQLite)
# Add CGO flags for Alpine Linux compatibility with SQLite
RUN CGO_ENABLED=1 CGO_CFLAGS="-D_LARGEFILE64_SOURCE" go build -o tracr-api -ldflags="-s -w" main.go

# Stage 2: Runtime
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates sqlite tzdata

# Create non-root user
RUN adduser -D -u 1000 tracr

# Create data directory for database
RUN mkdir -p /data && chown tracr:tracr /data

# Copy compiled binary from builder stage
COPY --from=builder /build/tracr-api /tracr-api

# Set environment variables
ENV DATABASE_PATH=/data/tracr.db
ENV PORT=8080
ENV LOG_LEVEL=INFO

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Set user
USER tracr

# Run the application
CMD ["/tracr-api"]