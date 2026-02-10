import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResumeUpload from '../ResumeUpload'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client } from '@aws-sdk/client-s3'

vi.mock('aws-amplify/auth')
vi.mock('@aws-sdk/client-s3')

describe('ResumeUpload', () => {
  const mockOnResumeUploaded = vi.fn()
  const mockCredentials = { accessKeyId: 'test', secretAccessKey: 'test' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials
    } as any)
  })

  it('renders upload form', () => {
    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)
    
    expect(screen.getByText('Upload Resume(s)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload resume/i })).toBeInTheDocument()
  })

  it('disables upload button when no files selected', () => {
    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)
    
    const uploadButton = screen.getByRole('button', { name: /upload resume/i })
    expect(uploadButton).toBeDisabled()
  })

  it('handles file upload successfully', async () => {
    const mockSend = vi.fn().mockResolvedValue({})
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)
    
    const file = new File(['test content'], 'resume.md', { type: 'text/markdown' })
    const input = screen.getByLabelText(/resume file/i)
    
    fireEvent.change(input, { target: { files: [file] } })
    
    const uploadButton = screen.getByRole('button', { name: /upload resume/i })
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(mockOnResumeUploaded).toHaveBeenCalled()
    })
  })

  it('shows error message on upload failure', async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error('Upload failed'))
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)
    
    const file = new File(['test'], 'resume.md', { type: 'text/markdown' })
    const input = screen.getByLabelText(/resume file/i)
    
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /upload resume/i }))

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
    })
  })

  it('loads existing resumes on mount', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Contents: [
        { Key: 'uploads/test-user/resume1.md', Size: 1000, LastModified: new Date() }
      ]
    })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeUpload userId="test-user" onResumeUploaded={mockOnResumeUploaded} />)

    await waitFor(() => {
      expect(mockOnResumeUploaded).toHaveBeenCalledWith('uploads/test-user/resume1.md')
    })
  })
})
