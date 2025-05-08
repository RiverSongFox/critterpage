#!/bin/bash

# Set DOMAIN variable here (override default or pass as first argument)
DOMAIN=${1:-example.com}

if [ -z "$DOMAIN" ]; then
  echo "Error: DOMAIN variable not set"
  exit 1
fi

if [ -f keys/server.key ] || [ -f keys/server.crt ]; then
  echo "Info: Certificate or key already exists."
  exit 0
fi

mkdir -p keys

echo "Generating private key..."
openssl ecparam -genkey -name secp384r1 -out keys/server.key

echo "Generating certificate..."
openssl req -new -x509 -sha256 -key keys/server.key -out keys/server.crt -days 3650 \
  -subj "/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN"
