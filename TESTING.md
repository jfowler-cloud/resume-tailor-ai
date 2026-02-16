# Testing Guide

## Backend Tests (Lambda Functions)

### Setup
```bash
cd lambda
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-test.txt
```

### Run Tests
```bash
# Activate virtual environment
source .venv/bin/activate

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
- `tests/test_parse_job.py` - Tests for job description parsing (4 tests)
- `tests/test_analyze_resume.py` - Tests for resume analysis (3 tests)
- `tests/test_generate_resume.py` - Tests for resume generation (3 tests)
- `tests/test_save_results.py` - Tests for DynamoDB operations (3 tests)
- `tests/test_validation.py` - Tests for input validation (20 tests)
- `tests/test_ats_optimize.py` - Tests for ATS optimization (8 tests)
- `tests/test_convert_to_pdf.py` - Tests for PDF conversion (12 tests)
- `tests/test_cover_letter.py` - Tests for cover letter generation (10 tests)
- `tests/test_critical_review.py` - Tests for critical review (10 tests)
- `tests/test_extract_json.py` - Tests for JSON extraction (26 tests)
- `tests/test_notify.py` - Tests for email notifications (12 tests)
- `tests/test_refine_resume.py` - Tests for resume refinement (10 tests)

### Coverage Results
- **Total**: 121 tests, 96% coverage
- `ats_optimize.py` - 100%
- `convert_to_pdf.py` - 100%
- `cover_letter.py` - 100%
- `critical_review.py` - 100%
- `notify.py` - 100%
- `parse_job.py` - 100%
- `refine_resume.py` - 100%
- `extract_json.py` - 96%
- `validation.py` - 95%
- `save_results.py` - 93%
- `analyze_resume.py` - 92%
- `generate_resume.py` - 88%

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
- `__tests__/ResumeUpload.test.tsx` - Resume upload component tests (3 tests)
- `__tests__/JobAnalysis.test.tsx` - Job analysis form tests (4 tests)
- `__tests__/ResumeManagement.test.tsx` - Resume library tests (3 tests)

### Coverage Results
- **Total**: 10 tests, 22% coverage
- Components tested: ResumeUpload, JobAnalysis, ResumeManagement
- Config: amplify.ts - 100%

## Test Summary

| Category | Tests | Coverage | Status |
|----------|-------|----------|--------|
| **Backend** | 121 | 96% | ✅ All Passing |
| **Frontend** | 10 | 22% | ✅ All Passing |
| **Total** | **131** | - | ✅ **All Passing** |

## Quick Test Scripts

```bash
# Run all backend tests
cd lambda && source .venv/bin/activate && PYTHONPATH=functions pytest tests/ -v

# Run all frontend tests
cd frontend && npm test
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
