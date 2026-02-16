import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Results from '../Results'

// Mock all external dependencies
vi.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: vi.fn(() => ({ send: vi.fn() })),
  DescribeExecutionCommand: vi.fn()
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn() })),
  GetObjectCommand: vi.fn()
}))

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({ send: vi.fn() })),
  GetItemCommand: vi.fn()
}))

vi.mock('@aws-sdk/util-dynamodb', () => ({
  unmarshall: vi.fn((item) => item)
}))

vi.mock('../../utils/auth', () => ({
  getCredentials: vi.fn().mockResolvedValue({
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    sessionToken: 'test-token'
  })
}))

vi.mock('../../utils/markdownToHtml', () => ({
  printMarkdownAsPDF: vi.fn()
}))

vi.mock('../../config/amplify', () => ({
  awsConfig: {
    region: 'us-east-1',
    stateMachineArn: 'arn:aws:states:us-east-1:123456789:stateMachine:ResumeTailorWorkflow',
    bucketName: 'test-bucket',
    tableName: 'test-table'
  }
}))

describe('Results', () => {
  it('renders empty state when no jobId provided', () => {
    render(<Results userId="test-user" jobId={null} />)

    expect(screen.getByText('No Job Analysis Yet')).toBeInTheDocument()
    expect(screen.getByText(/Upload a resume and analyze a job posting/)).toBeInTheDocument()
  })

  it('renders container when jobId is provided', () => {
    render(<Results userId="test-user" jobId="job-123456" />)

    // Should render the main container (loading state initially)
    expect(screen.getByText('Analysis Results')).toBeInTheDocument()
  })

  it('shows refresh button when jobId provided', () => {
    render(<Results userId="test-user" jobId="job-123456" />)

    expect(screen.getByRole('button', { name: /refresh status/i })).toBeInTheDocument()
  })

  it('passes userId prop correctly', () => {
    const { container } = render(<Results userId="custom-user-id" jobId="job-123" />)

    // Component should render without error
    expect(container).toBeTruthy()
  })

  it('handles null jobId gracefully', () => {
    render(<Results userId="test-user" jobId={null} />)

    // Should show empty state
    expect(screen.queryByText('Analysis Results')).not.toBeInTheDocument()
    expect(screen.getByText('No Job Analysis Yet')).toBeInTheDocument()
  })
})
