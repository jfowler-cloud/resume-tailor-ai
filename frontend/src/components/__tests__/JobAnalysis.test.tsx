import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import JobAnalysis from '../JobAnalysis'
import { fetchAuthSession } from 'aws-amplify/auth'
import { SFNClient } from '@aws-sdk/client-sfn'

vi.mock('aws-amplify/auth')
vi.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: vi.fn(),
  StartExecutionCommand: vi.fn()
}))
vi.mock('../../utils/auth', () => ({
  getCredentials: vi.fn().mockResolvedValue({
    accessKeyId: 'test',
    secretAccessKey: 'test'
  })
}))

describe('JobAnalysis', () => {
  const mockOnJobSubmitted = vi.fn()
  const mockCredentials = { accessKeyId: 'test', secretAccessKey: 'test' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials
    } as any)
    
    const mockSend = vi.fn()
    vi.mocked(SFNClient).mockImplementation(() => ({
      send: mockSend
    } as any))
  })

  it('renders job analysis form', () => {
    render(<JobAnalysis userId="test-user" uploadedResumes={[]} onJobSubmitted={mockOnJobSubmitted} />)
    
    expect(screen.getByText('Analyze Job Posting')).toBeInTheDocument()
  })

  it('shows job description field', () => {
    render(<JobAnalysis userId="test-user" uploadedResumes={[]} onJobSubmitted={mockOnJobSubmitted} />)
    
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument()
  })

  it('shows resume selector', () => {
    render(<JobAnalysis userId="test-user" uploadedResumes={['resume1.md']} onJobSubmitted={mockOnJobSubmitted} />)
    
    expect(screen.getByText(/select resumes/i, { selector: 'label' })).toBeInTheDocument()
  })

  it('shows submit button', () => {
    render(<JobAnalysis userId="test-user" uploadedResumes={[]} onJobSubmitted={mockOnJobSubmitted} />)
    
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })
})
