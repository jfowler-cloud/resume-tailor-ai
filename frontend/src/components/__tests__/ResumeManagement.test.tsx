import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ResumeManagement from '../ResumeManagement'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client } from '@aws-sdk/client-s3'

vi.mock('aws-amplify/auth')
vi.mock('@aws-sdk/client-s3')

describe('ResumeManagement', () => {
  const mockCredentials = { accessKeyId: 'test', secretAccessKey: 'test' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials
    } as any)
  })

  it('renders resume library', () => {
    render(<ResumeManagement userId="test-user" />)
    
    expect(screen.getByText('Resume Library')).toBeInTheDocument()
  })

  it('loads and displays resumes', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Contents: [
        {
          Key: 'uploads/test-user/resume1.md',
          Size: 1024,
          LastModified: new Date('2024-01-01')
        },
        {
          Key: 'uploads/test-user/resume2.md',
          Size: 2048,
          LastModified: new Date('2024-01-02')
        }
      ]
    })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeManagement userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText('resume1.md')).toBeInTheDocument()
      expect(screen.getByText('resume2.md')).toBeInTheDocument()
    })
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

  it('displays resume sizes correctly', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Contents: [
        {
          Key: 'uploads/test-user/resume.md',
          Size: 2048,
          LastModified: new Date()
        }
      ]
    })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeManagement userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    })
  })

  it('sorts resumes by last modified date', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      Contents: [
        {
          Key: 'uploads/test-user/old.md',
          Size: 1000,
          LastModified: new Date('2024-01-01')
        },
        {
          Key: 'uploads/test-user/new.md',
          Size: 1000,
          LastModified: new Date('2024-01-10')
        }
      ]
    })
    vi.mocked(S3Client).mockImplementation(() => ({
      send: mockSend
    } as any))

    render(<ResumeManagement userId="test-user" />)

    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('new.md')
      expect(rows[2]).toHaveTextContent('old.md')
    })
  })
})
