#!/bin/bash
# Run all frontend tests

cd frontend

echo "Running frontend tests..."
npm test

echo ""
echo "To view coverage report, run: npm run test:coverage"
echo "To view interactive UI, run: npm run test:ui"
