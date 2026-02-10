import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ResumeManagement from '../ResumeManagement'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client } from '@aws-sdk/client-s3'

vi.mock('aws-amplify/auth')
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn()
}))

describe('ResumeManagement', () => {
  const mockCredentials = { accessKeyId: 'test', secretAccessKey: 'test' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials
    } as any)
  })

  it('renders resume library', () => {
    const mockSend = vi.fn().mockResolvedValue({ Contents: [] })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeManagement userId="test-user" />)
    
    expect(screen.getByText('Resume Library')).toBeInTheDocument()
  })

  it('shows refresh button', () => {
    const mockSend = vi.fn().mockResolvedValue({ Contents: [] })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeManagement userId="test-user" />)
    
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('shows empty state when no resumes', async () => {
    const mockSend = vi.fn().mockResolvedValue({ Contents: [] })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeManagement userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText(/no resumes/i)).toBeInTheDocument()
    })
  })
})
