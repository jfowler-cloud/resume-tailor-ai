#!/bin/bash
# Run all backend tests

cd lambda

echo "Installing test dependencies..."
pip install -r requirements-test.txt -q

echo "Running Lambda function tests..."
PYTHONPATH=functions pytest tests/ -v

echo ""
echo "Test coverage report generated in lambda/htmlcov/"
