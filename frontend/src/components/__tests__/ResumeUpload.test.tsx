import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResumeUpload from '../ResumeUpload'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client } from '@aws-sdk/client-s3'

vi.mock('aws-amplify/auth')
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn()
}))

vi.mock('../../utils/auth', () => ({
  getCredentials: vi.fn().mockResolvedValue({
    accessKeyId: 'test',
    secretAccessKey: 'test'
  })
}))

describe('ResumeUpload', () => {
  const mockOnResumeUploaded = vi.fn()
  const mockCredentials = { accessKeyId: 'test', secretAccessKey: 'test' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials
    } as any)
    
    const mockSend = vi.fn().mockResolvedValue({ Contents: [] })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))
  })

  it('renders upload form', () => {
    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)
    
    expect(screen.getByText('Upload Resume(s)')).toBeInTheDocument()
  })

  it('shows file input', () => {
    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)
    
    const input = screen.getByLabelText(/choose files/i)
    expect(input).toBeInTheDocument()
  })

  it('shows upload button', () => {
    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)
    
    const button = screen.getByRole('button', { name: /upload resume/i })
    expect(button).toBeInTheDocument()
  })
})
