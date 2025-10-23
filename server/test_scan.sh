#!/bin/bash
# Simple test script to POST a receipt image to the /api/scan endpoint
# Usage: ./test_scan.sh /path/to/receipt.jpg

if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/receipt.jpg"
  exit 1
fi

FILEPATH="$1"

curl -v -X POST http://localhost:3001/api/scan \
  -F "receipt=@${FILEPATH}" \
  -H "Accept: application/json"
