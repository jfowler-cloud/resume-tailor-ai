import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Spinner from '@cloudscape-design/components/spinner'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Badge from '@cloudscape-design/components/badge'
import { awsConfig } from '../config/amplify'

interface ResultsProps {
  userId: string
  jobId: string | null
}

interface ExecutionStatus {
  status: string
  output?: string
}

interface AnalysisData {
  fitScore?: number
  matchedSkills?: string[]
  missingSkills?: string[]
  strengths?: string[]
  weaknesses?: string[]
  gaps?: string[]
  recommendations?: string[]
  actionableSteps?: string[]
}

export default function Results({ jobId }: ResultsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null)
  const [tailoredResume, setTailoredResume] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)

  useEffect(() => {
    if (jobId) {
      checkStatus()
      const interval = setInterval(checkStatus, 5000)
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
        new DescribeExecutionCommand({ executionArn })
      )

      setExecutionStatus({
        status: response.status || 'UNKNOWN',
        output: response.output
      })

      if (response.status === 'SUCCEEDED') {
        await fetchResults(credentials)
        await fetchAnalysisData(credentials)
      }
    } catch (err) {
      console.error('Status check error:', err)
      setError(err instanceof Error ? err.message : 'Failed to check status')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalysisData = async (credentials: any) => {
    try {
      const dynamoClient = new DynamoDBClient({
        region: awsConfig.region,
        credentials: credentials
      })

      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: 'ResumeTailorResults',
          Key: {
            jobId: { S: jobId! }
          }
        })
      )

      if (response.Item) {
        const item = unmarshall(response.Item)
        setAnalysisData({
          fitScore: item.fitScore,
          matchedSkills: item.matchedSkills,
          missingSkills: item.missingSkills,
          strengths: item.strengths,
          weaknesses: item.weaknesses,
          gaps: item.gaps,
          recommendations: item.recommendations,
          actionableSteps: item.actionableSteps
        })
      }
    } catch (err) {
      console.error('Fetch analysis data error:', err)
    }
  }

  const fetchResults = async (credentials: any) => {
    try {
      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

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

        {analysisData && (
          <Container header={<Header variant="h3">Analysis Summary</Header>}>
            <SpaceBetween size="l">
              {analysisData.fitScore !== undefined && (
                <Box>
                  <Box variant="awsui-key-label">Fit Score</Box>
                  <Badge color={analysisData.fitScore >= 70 ? 'green' : analysisData.fitScore >= 50 ? 'blue' : 'red'}>
                    {analysisData.fitScore}%
                  </Badge>
                </Box>
              )}

              <ColumnLayout columns={2} variant="text-grid">
                {analysisData.matchedSkills && analysisData.matchedSkills.length > 0 && (
                  <div>
                    <Box variant="awsui-key-label">Matched Skills</Box>
                    <SpaceBetween size="xs">
                      {analysisData.matchedSkills.map((skill, i) => (
                        <Badge key={i} color="green">✓ {skill}</Badge>
                      ))}
                    </SpaceBetween>
                  </div>
                )}

                {analysisData.missingSkills && analysisData.missingSkills.length > 0 && (
                  <div>
                    <Box variant="awsui-key-label">Missing Skills</Box>
                    <SpaceBetween size="xs">
                      {analysisData.missingSkills.map((skill, i) => (
                        <Badge key={i} color="red">✗ {skill}</Badge>
                      ))}
                    </SpaceBetween>
                  </div>
                )}
              </ColumnLayout>

              {analysisData.strengths && analysisData.strengths.length > 0 && (
                <ExpandableSection headerText="Strengths" defaultExpanded>
                  <ul>
                    {analysisData.strengths.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {analysisData.weaknesses && analysisData.weaknesses.length > 0 && (
                <ExpandableSection headerText="Areas for Improvement">
                  <ul>
                    {analysisData.weaknesses.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {analysisData.gaps && analysisData.gaps.length > 0 && (
                <ExpandableSection headerText="Experience Gaps">
                  <ul>
                    {analysisData.gaps.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {analysisData.recommendations && analysisData.recommendations.length > 0 && (
                <ExpandableSection headerText="Recommendations">
                  <ul>
                    {analysisData.recommendations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {analysisData.actionableSteps && analysisData.actionableSteps.length > 0 && (
                <ExpandableSection headerText="Action Items">
                  <ul>
                    {analysisData.actionableSteps.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}
            </SpaceBetween>
          </Container>
        )}

        {tailoredResume && (
          <ExpandableSection headerText="Tailored Resume" defaultExpanded>
            <SpaceBetween size="m">
              <Button onClick={downloadResume} iconName="download">
                Download Resume (Markdown)
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
