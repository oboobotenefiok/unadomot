FROM rust:1.100-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl3 curl && rm -rf /var/lib/apt/lists/*
RUN useradd --system --uid 10001 --create-home unadomot
COPY --from=builder /app/target/release/unadomot-api /usr/local/bin/unadomot-api
COPY --from=builder /app/migrations ./migrations
ENV PORT=8080
EXPOSE 8080
USER unadomot
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/health || exit 1
CMD ["unadomot-api"]
