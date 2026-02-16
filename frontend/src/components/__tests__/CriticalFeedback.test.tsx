import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CriticalFeedback from '../CriticalFeedback'

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn(() => ({ send: vi.fn() })),
  InvokeCommand: vi.fn()
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn()
}))

vi.mock('../../utils/auth', () => ({
  getCredentials: vi.fn().mockResolvedValue({
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    sessionToken: 'test-token'
  })
}))

vi.mock('../../config/amplify', () => ({
  awsConfig: {
    region: 'us-east-1',
    bucketName: 'test-bucket',
    refineResumeFunctionName: 'refine-resume-function'
  }
}))

describe('CriticalFeedback', () => {
  const defaultProps = {
    jobId: 'job-123',
    userId: 'user-456',
    originalResume: '# Original Resume\n## Experience\n- Developer',
    criticalReview: {
      overallRating: 7,
      strengths: ['Strong technical skills', 'Good communication'],
      weaknesses: ['Needs more quantified achievements'],
      actionableSteps: ['Add metrics to bullet points'],
      competitiveAnalysis: 'Above average candidate',
      redFlags: ['Employment gap in 2020'],
      standoutElements: ['Unique projects'],
      summary: 'Solid resume with room for improvement'
    },
    jobDescription: 'Senior Developer role',
    parsedJob: { requiredSkills: ['Python', 'AWS'] }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders critical feedback header', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Critical Feedback')).toBeInTheDocument()
    expect(screen.getByText('Honest assessment of your resume quality')).toBeInTheDocument()
  })

  it('displays overall rating', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Overall Rating')).toBeInTheDocument()
    expect(screen.getByText('7/10')).toBeInTheDocument()
  })

  it('displays summary', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Solid resume with room for improvement')).toBeInTheDocument()
  })

  it('displays strengths', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Strengths')).toBeInTheDocument()
    expect(screen.getByText(/Strong technical skills/)).toBeInTheDocument()
    expect(screen.getByText(/Good communication/)).toBeInTheDocument()
  })

  it('displays weaknesses', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Weaknesses')).toBeInTheDocument()
    expect(screen.getByText(/Needs more quantified achievements/)).toBeInTheDocument()
  })

  it('displays red flags', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Red Flags')).toBeInTheDocument()
    expect(screen.getByText(/Employment gap in 2020/)).toBeInTheDocument()
  })

  it('displays actionable steps', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Actionable Steps')).toBeInTheDocument()
    expect(screen.getByText(/Add metrics to bullet points/)).toBeInTheDocument()
  })

  it('displays standout elements', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Standout Elements')).toBeInTheDocument()
    expect(screen.getByText(/Unique projects/)).toBeInTheDocument()
  })

  it('displays competitive analysis', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByText('Competitive Analysis')).toBeInTheDocument()
    expect(screen.getByText('Above average candidate')).toBeInTheDocument()
  })

  it('renders refine resume button', () => {
    render(<CriticalFeedback {...defaultProps} />)

    expect(screen.getByRole('button', { name: /refine resume/i })).toBeInTheDocument()
  })

  it('displays rating with high score', () => {
    const highRatingProps = {
      ...defaultProps,
      criticalReview: { ...defaultProps.criticalReview, overallRating: 9 }
    }

    render(<CriticalFeedback {...highRatingProps} />)

    expect(screen.getByText('9/10')).toBeInTheDocument()
  })

  it('displays rating with low score', () => {
    const lowRatingProps = {
      ...defaultProps,
      criticalReview: { ...defaultProps.criticalReview, overallRating: 3 }
    }

    render(<CriticalFeedback {...lowRatingProps} />)

    expect(screen.getByText('3/10')).toBeInTheDocument()
  })

  it('handles missing optional fields gracefully', () => {
    const minimalProps = {
      ...defaultProps,
      criticalReview: {
        overallRating: 5
      }
    }

    render(<CriticalFeedback {...minimalProps} />)

    expect(screen.getByText('5/10')).toBeInTheDocument()
    expect(screen.getByText('No summary available')).toBeInTheDocument()
  })

  it('does not render sections when arrays are empty', () => {
    const emptyArrayProps = {
      ...defaultProps,
      criticalReview: {
        overallRating: 6,
        strengths: [],
        weaknesses: [],
        redFlags: [],
        actionableSteps: [],
        standoutElements: []
      }
    }

    render(<CriticalFeedback {...emptyArrayProps} />)

    expect(screen.queryByText('Strengths')).not.toBeInTheDocument()
    expect(screen.queryByText('Weaknesses')).not.toBeInTheDocument()
  })
})
