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
import CriticalFeedback from './CriticalFeedback'

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

export default function Results({ jobId, userId }: ResultsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null)
  const [tailoredResume, setTailoredResume] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [criticalReview, setCriticalReview] = useState<CriticalReview | null>(null)
  const [jobDescription, setJobDescription] = useState<string>('')
  const [parsedJob, setParsedJob] = useState<any>(null)

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

      // Extract timestamp from jobId (format: job-1770761916695)
      const timestamp = jobId!.split('-')[1]

      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: 'ResumeTailorResults',
          Key: {
            jobId: { S: jobId! },
            timestamp: { N: timestamp }
          }
        })
      )

      if (response.Item) {
        const item = unmarshall(response.Item)
        console.log('DynamoDB item:', item)
        console.log('fitScore:', item.fitScore)
        console.log('matchedSkills:', item.matchedSkills)
        console.log('missingSkills:', item.missingSkills)
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
        
        // Set critical review data
        if (item.criticalReview) {
          console.log('Critical review data:', item.criticalReview)
          setCriticalReview(item.criticalReview)
        } else {
          console.log('No critical review data found in item')
        }
        
        // Set job description and parsed job for refinement
        if (item.jobDescription) {
          setJobDescription(item.jobDescription)
        }
        if (item.parsedJob) {
          setParsedJob(item.parsedJob)
        }
        
        console.log('analysisData set:', {
          fitScore: item.fitScore,
          matchedSkills: item.matchedSkills
        })
      } else {
        console.log('No DynamoDB item found for jobId:', jobId, 'timestamp:', timestamp)
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

  const downloadResumePDF = () => {
    if (!tailoredResume) return
    
    // Convert markdown to HTML with better formatting
    const convertMarkdownToHTML = (md: string) => {
      const lines = md.split('\n')
      let html = ''
      let inTable = false
      let tableRows: string[] = []
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Detect table
        if (line.includes('|') && line.trim().startsWith('|')) {
          if (!inTable) {
            inTable = true
            tableRows = []
          }
          // Skip separator line
          if (line.match(/^\|[\s\-:]+\|/)) continue
          tableRows.push(line)
          continue
        } else if (inTable) {
          // End of table
          html += '<table><tbody>'
          tableRows.forEach((row, idx) => {
            const cells = row.split('|').filter(c => c.trim()).map(c => c.trim())
            const tag = idx === 0 ? 'th' : 'td'
            html += '<tr>' + cells.map(c => `<${tag}>${c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</${tag}>`).join('') + '</tr>'
          })
          html += '</tbody></table>'
          inTable = false
          tableRows = []
        }
        
        // Headers
        if (line.startsWith('# ')) {
          html += `<h1>${line.substring(2)}</h1>`
        } else if (line.startsWith('## ')) {
          html += `<h2>${line.substring(3)}</h2>`
        } else if (line.startsWith('### ')) {
          html += `<h3>${line.substring(4)}</h3>`
        } else if (line.trim() === '---') {
          html += '<hr>'
        } else if (line.startsWith('- ')) {
          const content = line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          html += `<li>${content}</li>`
        } else if (line.trim() === '') {
          html += '<div class="spacer"></div>'
        } else if (!inTable) {
          const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
          html += `<p>${content}</p>`
        }
      }
      
      return html
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resume</title>
  <style>
    @page { margin: 0.75in; }
    body { 
      font-family: 'Calibri', 'Arial', sans-serif; 
      line-height: 1.4; 
      max-width: 8.5in; 
      margin: 0 auto; 
      padding: 0;
      font-size: 11pt;
      color: #000;
    }
    h1 { 
      font-size: 18pt; 
      margin: 0 0 8pt 0; 
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 2px solid #000;
      padding-bottom: 4pt;
    }
    h2 { 
      font-size: 14pt; 
      margin: 14pt 0 8pt 0; 
      font-weight: bold;
      text-transform: uppercase;
    }
    h3 { 
      font-size: 12pt; 
      margin: 10pt 0 6pt 0; 
      font-weight: bold;
    }
    p { 
      margin: 4pt 0; 
      text-align: justify;
    }
    ul { 
      margin: 4pt 0; 
      padding-left: 20pt; 
      list-style-type: disc;
    }
    li { 
      margin: 3pt 0;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 6pt;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    strong { font-weight: bold; }
    em { font-style: italic; }
    hr { 
      border: none; 
      border-top: 1px solid #ccc; 
      margin: 10pt 0; 
    }
    .spacer { height: 8pt; }
    @media print { 
      body { margin: 0; padding: 0; }
      h1, h2, h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${convertMarkdownToHTML(tailoredResume)}
</body>
</html>
    `
    
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 1000)
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
                  <SpaceBetween size="xs">
                    <Box>
                      <Spinner /> Processing your resume... This may take a few minutes.
                    </Box>
                    <Box color="text-status-info" fontSize="body-s">
                      ⓘ Don't refresh the page. If the process fails, you'll see an error message automatically.
                    </Box>
                  </SpaceBetween>
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

        {criticalReview && tailoredResume && jobDescription && parsedJob && (
          <CriticalFeedback
            jobId={jobId!}
            userId={userId}
            originalResume={tailoredResume}
            criticalReview={criticalReview}
            jobDescription={jobDescription}
            parsedJob={parsedJob}
          />
        )}

        {tailoredResume && (
          <ExpandableSection headerText="Tailored Resume" defaultExpanded>
            <SpaceBetween size="m">
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={downloadResume} iconName="download">
                  Download Markdown
                </Button>
                <Button onClick={downloadResumePDF} iconName="file">
                  Print as PDF
                </Button>
              </SpaceBetween>
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
