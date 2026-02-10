import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JobAnalysis from '../JobAnalysis'
import { fetchAuthSession } from 'aws-amplify/auth'
import { SFNClient } from '@aws-sdk/client-sfn'

vi.mock('aws-amplify/auth')
vi.mock('@aws-sdk/client-sfn')

describe('JobAnalysis', () => {
  const mockOnJobSubmitted = vi.fn()
  const mockCredentials = { accessKeyId: 'test', secretAccessKey: 'test' }
  const uploadedResumes = ['uploads/user/resume1.md', 'uploads/user/resume2.md']

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials,
      tokens: { idToken: { payload: { email: 'test@example.com' } } }
    } as any)
  })

  it('renders job analysis form', () => {
    render(
      <JobAnalysis
        userId="test-user"
        uploadedResumes={uploadedResumes}
        onJobSubmitted={mockOnJobSubmitted}
      />
    )
    
    expect(screen.getByText('Analyze Job Posting')).toBeInTheDocument()
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument()
  })

  it('disables submit when no job description', () => {
    render(
      <JobAnalysis
        userId="test-user"
        uploadedResumes={uploadedResumes}
        onJobSubmitted={mockOnJobSubmitted}
      />
    )
    
    const submitButton = screen.getByRole('button', { name: /analyze & tailor resume/i })
    expect(submitButton).toBeDisabled()
  })

  it('allows multiple resume selection', () => {
    render(
      <JobAnalysis
        userId="test-user"
        uploadedResumes={uploadedResumes}
        onJobSubmitted={mockOnJobSubmitted}
      />
    )
    
    const select = screen.getByLabelText(/select resumes/i)
    expect(select).toBeInTheDocument()
  })

  it('submits job analysis successfully', async () => {
    const mockSend = vi.fn().mockResolvedValue({})
    vi.mocked(SFNClient).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(
      <JobAnalysis
        userId="test-user"
        uploadedResumes={uploadedResumes}
        onJobSubmitted={mockOnJobSubmitted}
      />
    )
    
    const jobDescInput = screen.getByLabelText(/job description/i)
    fireEvent.change(jobDescInput, { target: { value: 'Senior Python Developer' } })

    // Select resume
    const select = screen.getByLabelText(/select resumes/i)
    fireEvent.change(select, { target: { value: uploadedResumes[0] } })

    const submitButton = screen.getByRole('button', { name: /analyze & tailor resume/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnJobSubmitted).toHaveBeenCalled()
    })
  })

  it('shows error on submission failure', async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error('API Error'))
    vi.mocked(SFNClient).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(
      <JobAnalysis
        userId="test-user"
        uploadedResumes={uploadedResumes}
        onJobSubmitted={mockOnJobSubmitted}
      />
    )
    
    const jobDescInput = screen.getByLabelText(/job description/i)
    fireEvent.change(jobDescInput, { target: { value: 'Test job' } })

    const submitButton = screen.getByRole('button', { name: /analyze & tailor resume/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to start analysis/i)).toBeInTheDocument()
    })
  })
})
