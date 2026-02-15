import { useState } from 'react'
import { getCredentials } from '../utils/auth'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import Spinner from '@cloudscape-design/components/spinner'
import Modal from '@cloudscape-design/components/modal'
import Tabs from '@cloudscape-design/components/tabs'
import { awsConfig } from '../config/amplify'

interface CriticalReview {
  overallRating?: number
  strengths?: string[]
  weaknesses?: string[]
  actionableSteps?: string[]
  competitiveAnalysis?: string
  redFlags?: string[]
  standoutElements?: string[]
  summary?: string
}

interface CriticalFeedbackProps {
  jobId: string
  userId: string
  originalResume: string
  criticalReview: CriticalReview
  jobDescription: string
  parsedJob: any
}

export default function CriticalFeedback({
  jobId,
  userId,
  originalResume,
  criticalReview,
  jobDescription,
  parsedJob
}: CriticalFeedbackProps) {
  const [refining, setRefining] = useState(false)
  const [refinedResume, setRefinedResume] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const handleRefine = async () => {
    setRefining(true)
    setError(null)

    try {
      const credentials = await getCredentials()

      const lambdaClient = new LambdaClient({
        region: awsConfig.region,
        credentials: credentials
      })

      const payload = {
        originalResume,
        criticalReview,
        jobDescription,
        parsedJob
      }

      const response = await lambdaClient.send(
        new InvokeCommand({
          FunctionName: awsConfig.refineResumeFunctionName,
          Payload: new TextEncoder().encode(JSON.stringify(payload))
        })
      )

      const result = JSON.parse(new TextDecoder().decode(response.Payload))
      
      if (result.statusCode === 200) {
        setRefinedResume(result.refinedResumeMarkdown)
        
        // Save refined resume to S3
        const s3Client = new S3Client({
          region: awsConfig.region,
          credentials: credentials
        })

        const refinedKey = `users/${userId}/resumes/refined-${jobId}.md`
        await s3Client.send(
          new PutObjectCommand({
            Bucket: awsConfig.bucketName,
            Key: refinedKey,
            Body: result.refinedResumeMarkdown,
            ContentType: 'text/markdown'
          })
        )

        setShowComparison(true)
      } else {
        throw new Error(result.message || 'Failed to refine resume')
      }
    } catch (err) {
      console.error('Refine error:', err)
      setError(err instanceof Error ? err.message : 'Failed to refine resume')
    } finally {
      setRefining(false)
    }
  }

  const downloadResume = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'green'
    if (rating >= 6) return 'blue'
    if (rating >= 4) return 'grey'
    return 'red'
  }

  return (
    <>
      <Container
        header={
          <Header
            variant="h2"
            description="Honest assessment of your resume quality"
            actions={
              <Button
                variant="primary"
                onClick={handleRefine}
                loading={refining}
                disabled={refining || !!refinedResume}
              >
                {refinedResume ? 'Refined' : 'Refine Resume'}
              </Button>
            }
          >
            Critical Feedback
          </Header>
        }
      >
        <SpaceBetween size="l">
          {error && (
            <Alert type="error" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {refining && (
            <Alert type="info">
              <SpaceBetween size="s" direction="horizontal">
                <Spinner />
                <span>Refining your resume based on feedback...</span>
              </SpaceBetween>
            </Alert>
          )}

          {refinedResume && (
            <Alert type="success">
              Resume refined successfully! View the comparison below.
            </Alert>
          )}

          <ColumnLayout columns={2} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">Overall Rating</Box>
              <Badge color={getRatingColor(criticalReview.overallRating || 0)}>
                {criticalReview.overallRating || 0}/10
              </Badge>
            </div>
            <div>
              <Box variant="awsui-key-label">Summary</Box>
              <Box>{criticalReview.summary || 'No summary available'}</Box>
            </div>
          </ColumnLayout>

          {criticalReview.strengths && criticalReview.strengths.length > 0 && (
            <div>
              <Box variant="h3" margin={{ bottom: 's' }}>
                Strengths
              </Box>
              <SpaceBetween size="xs">
                {criticalReview.strengths.map((strength, idx) => (
                  <Box key={idx} color="text-status-success">
                    ✓ {strength}
                  </Box>
                ))}
              </SpaceBetween>
            </div>
          )}

          {criticalReview.weaknesses && criticalReview.weaknesses.length > 0 && (
            <div>
              <Box variant="h3" margin={{ bottom: 's' }}>
                Weaknesses
              </Box>
              <SpaceBetween size="xs">
                {criticalReview.weaknesses.map((weakness, idx) => (
                  <Box key={idx} color="text-status-error">
                    ✗ {weakness}
                  </Box>
                ))}
              </SpaceBetween>
            </div>
          )}

          {criticalReview.redFlags && criticalReview.redFlags.length > 0 && (
            <div>
              <Box variant="h3" margin={{ bottom: 's' }}>
                Red Flags
              </Box>
              <SpaceBetween size="xs">
                {criticalReview.redFlags.map((flag, idx) => (
                  <Box key={idx} color="text-status-error">
                    ⚠ {flag}
                  </Box>
                ))}
              </SpaceBetween>
            </div>
          )}

          {criticalReview.actionableSteps && criticalReview.actionableSteps.length > 0 && (
            <div>
              <Box variant="h3" margin={{ bottom: 's' }}>
                Actionable Steps
              </Box>
              <SpaceBetween size="xs">
                {criticalReview.actionableSteps.map((step, idx) => (
                  <Box key={idx}>
                    {idx + 1}. {step}
                  </Box>
                ))}
              </SpaceBetween>
            </div>
          )}

          {criticalReview.standoutElements && criticalReview.standoutElements.length > 0 && (
            <div>
              <Box variant="h3" margin={{ bottom: 's' }}>
                Standout Elements
              </Box>
              <SpaceBetween size="xs">
                {criticalReview.standoutElements.map((element, idx) => (
                  <Box key={idx} color="text-status-info">
                    ★ {element}
                  </Box>
                ))}
              </SpaceBetween>
            </div>
          )}

          {criticalReview.competitiveAnalysis && (
            <div>
              <Box variant="h3" margin={{ bottom: 's' }}>
                Competitive Analysis
              </Box>
              <Box>{criticalReview.competitiveAnalysis}</Box>
            </div>
          )}
        </SpaceBetween>
      </Container>

      {refinedResume && (
        <Modal
          visible={showComparison}
          onDismiss={() => setShowComparison(false)}
          size="max"
          header="Resume Comparison"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={() => setShowComparison(false)}>
                  Close
                </Button>
                <Button onClick={() => downloadResume(originalResume, 'original-resume.md')}>
                  Download Original
                </Button>
                <Button variant="primary" onClick={() => downloadResume(refinedResume, 'refined-resume.md')}>
                  Download Refined
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <Tabs
            tabs={[
              {
                id: 'side-by-side',
                label: 'Side by Side',
                content: (
                  <ColumnLayout columns={2}>
                    <Container header={<Header variant="h3">Original Resume</Header>}>
                      <Box fontSize="body-s">
                        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                          {originalResume}
                        </pre>
                      </Box>
                    </Container>
                    <Container header={<Header variant="h3">Refined Resume</Header>}>
                      <Box fontSize="body-s">
                        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                          {refinedResume}
                        </pre>
                      </Box>
                    </Container>
                  </ColumnLayout>
                )
              },
              {
                id: 'original',
                label: 'Original',
                content: (
                  <Container>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {originalResume}
                    </pre>
                  </Container>
                )
              },
              {
                id: 'refined',
                label: 'Refined',
                content: (
                  <Container>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {refinedResume}
                    </pre>
                  </Container>
                )
              }
            ]}
          />
        </Modal>
      )}
    </>
  )
}
