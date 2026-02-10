import { useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import FormField from '@cloudscape-design/components/form-field'
import Textarea from '@cloudscape-design/components/textarea'
import Input from '@cloudscape-design/components/input'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import Select from '@cloudscape-design/components/select'
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
  const [selectedResume, setSelectedResume] = useState<{ label: string; value: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resumeOptions = uploadedResumes.map(key => ({
    label: key.split('/').pop() || key,
    value: key
  }))

  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description')
      return
    }

    if (!selectedResume) {
      setError('Please select a resume')
      return
    }

    setSubmitting(true)
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

      const jobId = `job-${Date.now()}`
      const input = {
        jobId,
        userId,
        jobDescription: jobDescription.trim(),
        resumeS3Key: selectedResume.value,
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

      onJobSubmitted(jobId)
      setJobDescription('')
      setCompanyName('')
      setCustomInstructions('')
      setSelectedResume(null)
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
          label="Select Resume"
          description="Choose which resume to tailor for this job"
        >
          <Select
            selectedOption={selectedResume}
            onChange={({ detail }) => setSelectedResume(detail.selectedOption)}
            options={resumeOptions}
            placeholder="Select a resume"
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
          disabled={!jobDescription.trim() || !selectedResume || uploadedResumes.length === 0}
        >
          Analyze & Tailor Resume
        </Button>
      </SpaceBetween>
    </Container>
  )
}
