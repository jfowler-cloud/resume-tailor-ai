import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Spinner from '@cloudscape-design/components/spinner'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { awsConfig } from '../config/amplify'

interface ResultsProps {
  userId: string
  jobId: string | null
}

interface ExecutionStatus {
  status: string
  output?: string
}

export default function Results({ userId, jobId }: ResultsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null)
  const [tailoredResume, setTailoredResume] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<string | null>(null)

  useEffect(() => {
    if (jobId) {
      checkStatus()
      const interval = setInterval(checkStatus, 5000) // Poll every 5 seconds
      return () => clearInterval(interval)
    }
  }, [jobId])

  const checkStatus = async () => {
    if (!jobId) return

    setLoading(true)
    setError(null)

    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials

      if (!credentials) {
        throw new Error('No credentials available')
      }

      const sfnClient = new SFNClient({
        region: awsConfig.region,
        credentials: credentials
      })

      const executionArn = `arn:aws:states:${awsConfig.region}:${awsConfig.stateMachineArn.split(':')[4]}:execution:ResumeTailorWorkflow:${jobId}`

      const response = await sfnClient.send(
        new DescribeExecutionCommand({
          executionArn
        })
      )

      setExecutionStatus({
        status: response.status || 'UNKNOWN',
        output: response.output
      })

      // If succeeded, fetch results from S3
      if (response.status === 'SUCCEEDED') {
        await fetchResults(credentials)
      }
    } catch (err) {
      console.error('Status check error:', err)
      setError(err instanceof Error ? err.message : 'Failed to check status')
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async (credentials: any) => {
    try {
      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      // Fetch tailored resume
      try {
        const resumeResponse = await s3Client.send(
          new GetObjectCommand({
            Bucket: awsConfig.bucketName,
            Key: `tailored/${jobId}/resume.md`
          })
        )
        const resumeContent = await resumeResponse.Body?.transformToString()
        setTailoredResume(resumeContent || null)
      } catch (err) {
        console.log('Resume not found yet')
      }

      // Fetch cover letter
      try {
        const letterResponse = await s3Client.send(
          new GetObjectCommand({
            Bucket: awsConfig.bucketName,
            Key: `tailored/${jobId}/cover_letter.txt`
          })
        )
        const letterContent = await letterResponse.Body?.transformToString()
        setCoverLetter(letterContent || null)
      } catch (err) {
        console.log('Cover letter not found yet')
      }
    } catch (err) {
      console.error('Fetch results error:', err)
    }
  }

  const downloadResume = () => {
    if (!tailoredResume) return
    const blob = new Blob([tailoredResume], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tailored-resume-${jobId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCoverLetter = () => {
    if (!coverLetter) return
    const blob = new Blob([coverLetter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cover-letter-${jobId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!jobId) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <SpaceBetween size="m">
            <Box variant="h2">No Job Analysis Yet</Box>
            <Box variant="p" color="text-body-secondary">
              Upload a resume and analyze a job posting to see results here
            </Box>
          </SpaceBetween>
        </Box>
      </Container>
    )
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="View your tailored resume and analysis results"
          actions={
            <Button onClick={checkStatus} loading={loading}>
              Refresh Status
            </Button>
          }
        >
          Analysis Results
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {executionStatus && (
          <Alert
            type={
              executionStatus.status === 'SUCCEEDED'
                ? 'success'
                : executionStatus.status === 'FAILED'
                ? 'error'
                : 'info'
            }
          >
            <SpaceBetween size="xs">
              <Box>
                <strong>Status:</strong>{' '}
                <StatusIndicator
                  type={
                    executionStatus.status === 'SUCCEEDED'
                      ? 'success'
                      : executionStatus.status === 'RUNNING'
                      ? 'in-progress'
                      : executionStatus.status === 'FAILED'
                      ? 'error'
                      : 'info'
                  }
                >
                  {executionStatus.status}
                </StatusIndicator>
              </Box>
              {executionStatus.status === 'RUNNING' && (
                <Box>
                  <Spinner /> Processing your resume... This may take 30-60 seconds.
                </Box>
              )}
            </SpaceBetween>
          </Alert>
        )}

        {tailoredResume && (
          <ExpandableSection headerText="Tailored Resume" defaultExpanded>
            <SpaceBetween size="m">
              <Button onClick={downloadResume} iconName="download">
                Download Resume
              </Button>
              <Box>
                <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {tailoredResume}
                </pre>
              </Box>
            </SpaceBetween>
          </ExpandableSection>
        )}

        {coverLetter && (
          <ExpandableSection headerText="Cover Letter">
            <SpaceBetween size="m">
              <Button onClick={downloadCoverLetter} iconName="download">
                Download Cover Letter
              </Button>
              <Box>
                <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {coverLetter}
                </pre>
              </Box>
            </SpaceBetween>
          </ExpandableSection>
        )}

        {!tailoredResume && !coverLetter && executionStatus?.status === 'SUCCEEDED' && (
          <Alert type="warning">
            Results are being generated. Please refresh in a few moments.
          </Alert>
        )}
      </SpaceBetween>
    </Container>
  )
}
