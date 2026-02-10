# Testing Guide

## Backend Tests (Lambda Functions)

### Setup
```bash
cd lambda
pip install -r requirements-test.txt
```

### Run Tests
```bash
# Run all tests
PYTHONPATH=functions pytest tests/ -v

# Run specific test file
PYTHONPATH=functions pytest tests/test_parse_job.py -v

# Run with coverage
PYTHONPATH=functions pytest tests/ --cov=functions --cov-report=html

# View coverage report
open htmlcov/index.html
```

### Test Structure
- `tests/test_parse_job.py` - Tests for job description parsing
- `tests/test_analyze_resume.py` - Tests for resume analysis
- `tests/test_generate_resume.py` - Tests for resume generation
- `tests/test_save_results.py` - Tests for DynamoDB operations

## Frontend Tests (React Components)

### Setup
```bash
cd frontend
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Test Structure
- `__tests__/ResumeUpload.test.tsx` - Resume upload component tests
- `__tests__/JobAnalysis.test.tsx` - Job analysis form tests
- `__tests__/ResumeManagement.test.tsx` - Resume library tests

## Quick Test Scripts

```bash
# Run all backend tests
./scripts/test-backend.sh

# Run all frontend tests
./scripts/test-frontend.sh
```

## Test Coverage Goals

- Backend: >80% code coverage
- Frontend: >70% code coverage
- All critical paths tested
- Error handling validated

## Writing New Tests

### Backend (Python)
```python
def test_function_name():
    """Test description"""
    # Arrange
    event = {'key': 'value'}
    
    # Act
    result = handler(event, None)
    
    # Assert
    assert result['statusCode'] == 200
```

### Frontend (TypeScript/React)
```typescript
it('test description', async () => {
  // Arrange
  render(<Component prop="value" />)
  
  // Act
  fireEvent.click(screen.getByRole('button'))
  
  // Assert
  await waitFor(() => {
    expect(screen.getByText('Expected')).toBeInTheDocument()
  })
})
```
