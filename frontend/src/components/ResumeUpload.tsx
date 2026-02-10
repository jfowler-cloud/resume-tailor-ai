import { useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import FormField from '@cloudscape-design/components/form-field'
import FileUpload from '@cloudscape-design/components/file-upload'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import { awsConfig } from '../config/amplify'

interface ResumeUploadProps {
  userId: string
  onResumeUploaded: (resumeKey: string) => void
}

export default function ResumeUpload({ userId, onResumeUploaded }: ResumeUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      // Get AWS credentials from Cognito
      const session = await fetchAuthSession()
      const credentials = session.credentials

      if (!credentials) {
        throw new Error('No credentials available')
      }

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      const file = files[0]
      const timestamp = Date.now()
      const resumeKey = `uploads/${userId}/${timestamp}-${file.name}`

      // Read file content
      const fileContent = await file.text()

      // Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: awsConfig.bucketName,
          Key: resumeKey,
          Body: fileContent,
          ContentType: file.type || 'text/plain'
        })
      )

      setSuccess(`Resume uploaded successfully: ${file.name}`)
      setFiles([])
      onResumeUploaded(resumeKey)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Upload your resume in Markdown or text format"
        >
          Upload Resume
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert type="success" dismissible onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <FormField
          label="Resume File"
          description="Upload your resume in .md or .txt format"
        >
          <FileUpload
            value={files}
            onChange={({ detail }) => setFiles(detail.value)}
            accept=".md,.txt"
            i18nStrings={{
              uploadButtonText: e => e ? 'Choose files' : 'Choose file',
              dropzoneText: e => e ? 'Drop files to upload' : 'Drop file to upload',
              removeFileAriaLabel: e => `Remove file ${e + 1}`,
              limitShowFewer: 'Show fewer files',
              limitShowMore: 'Show more files',
              errorIconAriaLabel: 'Error'
            }}
            showFileLastModified
            showFileSize
            showFileThumbnail
            tokenLimit={1}
          />
        </FormField>

        <Button
          variant="primary"
          onClick={handleUpload}
          loading={uploading}
          disabled={files.length === 0}
        >
          Upload Resume
        </Button>
      </SpaceBetween>
    </Container>
  )
}
