FROM rust:1.100-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY services/api/Cargo.toml services/api/Cargo.lock ./
COPY services/api/src ./src
COPY services/api/migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/unadomot-api /usr/local/bin/unadomot-api
COPY --from=builder /app/migrations ./migrations
ENV PORT=8080
EXPOSE 8080
CMD ["unadomot-api"]
