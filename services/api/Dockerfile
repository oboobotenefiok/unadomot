FROM rust:1.100-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/unadomot-api /usr/local/bin/unadomot-api
COPY --from=builder /app/migrations ./migrations
ENV BIND_ADDR=0.0.0.0:3000
EXPOSE 3000
CMD ["unadomot-api"]
