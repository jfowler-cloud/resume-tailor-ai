import { useState, useRef } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { getCredentials } from '../utils/auth'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import FormField from '@cloudscape-design/components/form-field'
import Textarea from '@cloudscape-design/components/textarea'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import Multiselect from '@cloudscape-design/components/multiselect'
import { awsConfig } from '../config/amplify'

interface JobAnalysisProps {
  userId: string
  uploadedResumes: string[]
  onJobSubmitted: (jobId: string) => void
}

export default function JobAnalysis({ userId, uploadedResumes, onJobSubmitted }: JobAnalysisProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [selectedResumes, setSelectedResumes] = useState<{ label: string; value: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastSubmitTime = useRef<number>(0)

  const MIN_SUBMIT_INTERVAL_MS = 10000 // 10 seconds between submissions
  const MAX_JOB_DESCRIPTION_LENGTH = 50000

  const resumeOptions = uploadedResumes.map(key => ({
    label: key.split('/').pop() || key,
    value: key
  })) as { label: string; value: string }[]

  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description')
      return
    }

    if (jobDescription.trim().length > MAX_JOB_DESCRIPTION_LENGTH) {
      setError(`Job description is too long (max ${MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()} characters)`)
      return
    }

    if (selectedResumes.length === 0) {
      setError('Please select at least one resume')
      return
    }

    // Rate limit: prevent rapid submissions
    const now = Date.now()
    const elapsed = now - lastSubmitTime.current
    if (elapsed < MIN_SUBMIT_INTERVAL_MS) {
      const waitSec = Math.ceil((MIN_SUBMIT_INTERVAL_MS - elapsed) / 1000)
      setError(`Please wait ${waitSec} seconds before submitting again`)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const session = await fetchAuthSession()
      const credentials = await getCredentials()

      const sfnClient = new SFNClient({
        region: awsConfig.region,
        credentials: credentials
      })

      const jobId = `job-${Date.now()}`
      const input = {
        jobId,
        userId,
        jobDescription: jobDescription.trim(),
        resumeS3Keys: selectedResumes.map(r => r.value),
        companyName: companyName.trim() || undefined,
        customInstructions: customInstructions.trim() || undefined,
        userEmail: session.tokens?.idToken?.payload.email as string
      }

      await sfnClient.send(
        new StartExecutionCommand({
          stateMachineArn: awsConfig.stateMachineArn,
          input: JSON.stringify(input),
          name: jobId
        })
      )

      lastSubmitTime.current = Date.now()
      onJobSubmitted(jobId)
      setJobDescription('')
      setCompanyName('')
      setCustomInstructions('')
      setSelectedResumes([])
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start analysis')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Paste the job description and we'll tailor your resume"
        >
          Analyze Job Posting
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <FormField
          label="Select Resumes"
          description="Choose one or more resumes to use as context for tailoring"
        >
          <Multiselect
            selectedOptions={selectedResumes}
            onChange={({ detail }) => setSelectedResumes(detail.selectedOptions as { label: string; value: string }[])}
            options={resumeOptions}
            placeholder="Select resumes"
            empty="No resumes uploaded yet"
            disabled={uploadedResumes.length === 0}
          />
        </FormField>

        <FormField
          label="Company Name (Optional)"
          description="Enter the company name for personalization"
        >
          <Input
            value={companyName}
            onChange={({ detail }) => setCompanyName(detail.value)}
            placeholder="e.g., Amazon, Microsoft, Google"
          />
        </FormField>

        <FormField
          label="Job Description"
          description="Paste the complete job posting including requirements and responsibilities"
          constraintText={`${jobDescription.length.toLocaleString()} / ${MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()} characters`}
        >
          <Textarea
            value={jobDescription}
            onChange={({ detail }) => setJobDescription(detail.value)}
            placeholder="Paste the full job description here..."
            rows={15}
          />
        </FormField>

        <FormField
          label="Custom Instructions (Optional)"
          description="Add specific guidance for the AI (e.g., 'Emphasize leadership experience' or 'Don't enhance technical skills too much')"
        >
          <Textarea
            value={customInstructions}
            onChange={({ detail }) => setCustomInstructions(detail.value)}
            placeholder="e.g., Focus on my recent work at Company X, downplay older roles..."
            rows={3}
          />
        </FormField>

        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!jobDescription.trim() || selectedResumes.length === 0 || uploadedResumes.length === 0}
        >
          Analyze & Tailor Resume
        </Button>
      </SpaceBetween>
    </Container>
  )
}
