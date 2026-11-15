# Stage 1: Build
FROM golang:1.27.1-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/api ./cmd/api

# Stage 2: Minimal runtime image
FROM alpine:3.24

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/bin/api /app/api
COPY --chmod=0444 migrations/ /app/migrations/

EXPOSE 8080

USER 10001:10001

CMD ["/app/api"]
