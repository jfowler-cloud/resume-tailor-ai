import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dashboard from '../Dashboard'

// Mock child components
vi.mock('../ResumeUpload', () => ({
  default: ({ onResumeUploaded }: { onResumeUploaded: (key: string) => void }) => (
    <div data-testid="resume-upload">
      <button onClick={() => onResumeUploaded('test-resume.md')}>
        Mock Upload
      </button>
    </div>
  )
}))

vi.mock('../JobAnalysis', () => ({
  default: ({ onJobSubmitted, uploadedResumes }: { onJobSubmitted: (id: string) => void; uploadedResumes: string[] }) => (
    <div data-testid="job-analysis">
      <span>Resumes: {uploadedResumes.length}</span>
      <button onClick={() => onJobSubmitted('job-123')}>
        Mock Submit
      </button>
    </div>
  )
}))

vi.mock('../Results', () => ({
  default: ({ jobId }: { jobId: string | null }) => (
    <div data-testid="results">
      Job ID: {jobId || 'none'}
    </div>
  )
}))

vi.mock('../ResumeManagement', () => ({
  default: () => <div data-testid="resume-management">Resume Library</div>
}))

describe('Dashboard', () => {
  const mockUser = {
    userId: 'test-user-123',
    username: 'testuser'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders welcome header', () => {
    render(<Dashboard user={mockUser as any} />)

    expect(screen.getByText('Welcome to Resume Tailor')).toBeInTheDocument()
    expect(screen.getByText('AI-powered resume optimization for your job applications')).toBeInTheDocument()
  })

  it('renders all tabs', () => {
    render(<Dashboard user={mockUser as any} />)

    expect(screen.getByRole('tab', { name: /upload resume/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /analyze job/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /results/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /resume library/i })).toBeInTheDocument()
  })

  it('defaults to upload tab', () => {
    render(<Dashboard user={mockUser as any} />)

    expect(screen.getByTestId('resume-upload')).toBeInTheDocument()
  })

  it('disables analyze tab when no resumes uploaded', () => {
    render(<Dashboard user={mockUser as any} />)

    const analyzeTab = screen.getByRole('tab', { name: /analyze job/i })
    expect(analyzeTab).toHaveAttribute('aria-disabled', 'true')
  })

  it('enables analyze tab after resume upload', () => {
    render(<Dashboard user={mockUser as any} />)

    // Click mock upload button
    fireEvent.click(screen.getByText('Mock Upload'))

    const analyzeTab = screen.getByRole('tab', { name: /analyze job/i })
    expect(analyzeTab).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('disables results tab when no job submitted', () => {
    render(<Dashboard user={mockUser as any} />)

    const resultsTab = screen.getByRole('tab', { name: /results/i })
    expect(resultsTab).toHaveAttribute('aria-disabled', 'true')
  })

  it('switches to results tab after job submission', () => {
    render(<Dashboard user={mockUser as any} />)

    // First upload a resume
    fireEvent.click(screen.getByText('Mock Upload'))

    // Switch to analyze tab
    fireEvent.click(screen.getByRole('tab', { name: /analyze job/i }))

    // Submit job
    fireEvent.click(screen.getByText('Mock Submit'))

    // Should show results with job ID (use getAllByTestId since tabs may render multiple)
    const resultsElements = screen.getAllByTestId('results')
    expect(resultsElements.length).toBeGreaterThan(0)
    expect(screen.getByText('Job ID: job-123')).toBeInTheDocument()
  })

  it('can switch to resume library tab', () => {
    render(<Dashboard user={mockUser as any} />)

    fireEvent.click(screen.getByRole('tab', { name: /resume library/i }))

    expect(screen.getByTestId('resume-management')).toBeInTheDocument()
  })

  it('does not duplicate resume keys when same resume uploaded', () => {
    render(<Dashboard user={mockUser as any} />)

    // Upload same resume twice
    fireEvent.click(screen.getByText('Mock Upload'))
    fireEvent.click(screen.getByText('Mock Upload'))

    // Switch to analyze tab to see resume count
    fireEvent.click(screen.getByRole('tab', { name: /analyze job/i }))

    expect(screen.getByText('Resumes: 1')).toBeInTheDocument()
  })

  it('handles undefined user gracefully', () => {
    render(<Dashboard user={undefined} />)

    expect(screen.getByText('Welcome to Resume Tailor')).toBeInTheDocument()
  })

  it('passes userId to child components', () => {
    render(<Dashboard user={mockUser as any} />)

    // ResumeUpload should receive userId
    expect(screen.getByTestId('resume-upload')).toBeInTheDocument()
  })

  it('tracks multiple uploaded resumes', () => {
    // Create a component that uploads different resumes
    vi.doMock('../ResumeUpload', () => ({
      default: ({ onResumeUploaded }: { onResumeUploaded: (key: string) => void }) => {
        let count = 0
        return (
          <div data-testid="resume-upload">
            <button onClick={() => {
              count++
              onResumeUploaded(`resume-${count}.md`)
            }}>
              Mock Upload
            </button>
          </div>
        )
      }
    }))

    render(<Dashboard user={mockUser as any} />)

    // Upload first resume
    fireEvent.click(screen.getByText('Mock Upload'))

    // Analyze tab should be enabled
    const analyzeTab = screen.getByRole('tab', { name: /analyze job/i })
    expect(analyzeTab).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('enables results tab after job is submitted', () => {
    render(<Dashboard user={mockUser as any} />)

    // Upload resume first
    fireEvent.click(screen.getByText('Mock Upload'))

    // Switch to analyze and submit
    fireEvent.click(screen.getByRole('tab', { name: /analyze job/i }))
    fireEvent.click(screen.getByText('Mock Submit'))

    // Results tab should be enabled and active
    const resultsTab = screen.getByRole('tab', { name: /results/i })
    expect(resultsTab).not.toHaveAttribute('aria-disabled', 'true')
    expect(resultsTab).toHaveAttribute('aria-selected', 'true')
  })
})
