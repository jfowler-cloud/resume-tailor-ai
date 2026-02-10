import { useState } from 'react'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Tabs from '@cloudscape-design/components/tabs'
import ResumeUpload from './ResumeUpload'
import JobAnalysis from './JobAnalysis'
import Results from './Results'
import ResumeManagement from './ResumeManagement'
import { AuthUser } from 'aws-amplify/auth'

interface DashboardProps {
  user: AuthUser | undefined
}

export default function Dashboard({ user }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadedResumes, setUploadedResumes] = useState<string[]>([])
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  const handleResumeUploaded = (resumeKey: string) => {
    setUploadedResumes(prev => prev.includes(resumeKey) ? prev : [...prev, resumeKey])
  }

  const handleJobSubmitted = (jobId: string) => {
    setCurrentJobId(jobId)
    setActiveTab('results')
  }

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header
            variant="h1"
            description="AI-powered resume optimization for your job applications"
          >
            Welcome to Resume Tailor
          </Header>
        }
      >
        <Tabs
          activeTabId={activeTab}
          onChange={({ detail }) => setActiveTab(detail.activeTabId)}
          tabs={[
            {
              id: 'upload',
              label: 'Upload Resume',
              content: (
                <ResumeUpload
                  userId={user?.userId || 'unknown'}
                  onResumeUploaded={handleResumeUploaded}
                />
              )
            },
            {
              id: 'analyze',
              label: 'Analyze Job',
              content: (
                <JobAnalysis
                  userId={user?.userId || 'unknown'}
                  uploadedResumes={uploadedResumes}
                  onJobSubmitted={handleJobSubmitted}
                />
              ),
              disabled: uploadedResumes.length === 0
            },
            {
              id: 'results',
              label: 'Results',
              content: (
                <Results
                  userId={user?.userId || 'unknown'}
                  jobId={currentJobId}
                />
              ),
              disabled: !currentJobId
            },
            {
              id: 'library',
              label: 'Resume Library',
              content: (
                <ResumeManagement userId={user?.userId || 'unknown'} />
              )
            }
          ]}
        />
      </Container>
    </SpaceBetween>
  )
}
