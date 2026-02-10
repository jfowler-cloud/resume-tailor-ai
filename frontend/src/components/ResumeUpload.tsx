import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
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

  useEffect(() => {
    loadExistingResumes()
  }, [userId])

  const loadExistingResumes = async () => {
    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials
      if (!credentials) return

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: awsConfig.bucketName,
          Prefix: `uploads/${userId}/`
        })
      )

      if (response.Contents) {
        response.Contents.forEach(obj => {
          if (obj.Key) onResumeUploaded(obj.Key)
        })
      }
    } catch (err) {
      console.error('Failed to load existing resumes:', err)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials

      if (!credentials) {
        throw new Error('No credentials available')
      }

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      const uploadedKeys: string[] = []

      for (const file of files) {
        const timestamp = Date.now() + uploadedKeys.length
        const resumeKey = `uploads/${userId}/${timestamp}-${file.name}`
        const fileContent = await file.text()

        await s3Client.send(
          new PutObjectCommand({
            Bucket: awsConfig.bucketName,
            Key: resumeKey,
            Body: fileContent,
            ContentType: file.type || 'text/plain'
          })
        )

        uploadedKeys.push(resumeKey)
        onResumeUploaded(resumeKey)
      }

      setSuccess(`${uploadedKeys.length} resume(s) uploaded successfully`)
      setFiles([])
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
          description="Upload one or more resumes in Markdown or text format"
        >
          Upload Resume(s)
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
          label="Resume Files"
          description="Upload one or more resumes in .md or .txt format"
        >
          <FileUpload
            value={files}
            onChange={({ detail }) => setFiles(detail.value)}
            accept=".md,.txt"
            multiple
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
            tokenLimit={5}
          />
        </FormField>

        <Button
          variant="primary"
          onClick={handleUpload}
          loading={uploading}
          disabled={files.length === 0}
        >
          Upload Resume{files.length > 1 ? 's' : ''}
        </Button>
      </SpaceBetween>
    </Container>
  )
}
