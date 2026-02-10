import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
import FileUpload from '@cloudscape-design/components/file-upload'
import { awsConfig } from '../config/amplify'

interface ResumeItem {
  key: string
  name: string
  size: number
  lastModified: Date
}

interface ResumeManagementProps {
  userId: string
}

export default function ResumeManagement({ userId }: ResumeManagementProps) {
  const [resumes, setResumes] = useState<ResumeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<ResumeItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  useEffect(() => {
    loadResumes()
  }, [userId])

  const loadResumes = async () => {
    setLoading(true)
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
        const items = response.Contents
          .filter(obj => obj.Key && obj.Size && obj.LastModified)
          .map(obj => ({
            key: obj.Key!,
            name: obj.Key!.split('/').pop() || obj.Key!,
            size: obj.Size!,
            lastModified: obj.LastModified!
          }))
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        
        setResumes(items)
      }
    } catch (err) {
      console.error('Failed to load resumes:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadResume = async (item: ResumeItem) => {
    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials
      if (!credentials) return

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: awsConfig.bucketName,
          Key: item.key
        })
      )

      const content = await response.Body?.transformToString()
      if (!content) return

      const blob = new Blob([content], { type: 'text/markdown' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download resume:', err)
    }
  }

  const printResumePDF = async (item: ResumeItem) => {
    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials
      if (!credentials) return

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: awsConfig.bucketName,
          Key: item.key
        })
      )

      const content = await response.Body?.transformToString()
      if (!content) return

      const convertMarkdownToHTML = (md: string) => {
        return md.split('\n').map(line => {
          if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`
          if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`
          if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`
          if (line.trim() === '---') return '<hr>'
          if (line.startsWith('- ')) {
            const content = line.substring(2)
            return `<li>${content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`
          }
          if (line.trim() === '') return '<br>'
          let html = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
          return `<p>${html}</p>`
        }).join('\n')
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${item.name}</title>
  <style>
    @page { margin: 0.75in; }
    body { 
      font-family: 'Calibri', 'Arial', sans-serif; 
      line-height: 1.5; 
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
      margin: 16pt 0 8pt 0; 
      font-weight: bold;
      text-transform: uppercase;
    }
    h3 { 
      font-size: 12pt; 
      margin: 12pt 0 6pt 0; 
      font-weight: bold;
    }
    p { 
      margin: 6pt 0; 
      text-align: justify;
    }
    ul { 
      margin: 6pt 0; 
      padding-left: 20pt; 
      list-style-type: disc;
    }
    li { 
      margin: 4pt 0;
      text-align: justify;
    }
    strong { font-weight: bold; }
    em { font-style: italic; }
    hr { 
      border: none; 
      border-top: 1px solid #ccc; 
      margin: 12pt 0; 
    }
    @media print { 
      body { margin: 0; padding: 0; }
      h1, h2, h3 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
${convertMarkdownToHTML(content)}
</body>
</html>
      `
      
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => printWindow.print()
      }
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('Failed to print resume:', err)
    }
  }

  const downloadAll = async () => {
    for (const item of selectedItems) {
      await downloadResume(item)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const deleteResume = async (item: ResumeItem) => {
    if (!confirm(`Delete ${item.name}?`)) return

    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials
      if (!credentials) return

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: awsConfig.bucketName,
          Key: item.key
        })
      )

      await loadResumes()
    } catch (err) {
      console.error('Failed to delete resume:', err)
    }
  }

  const deleteAll = async () => {
    if (!confirm(`Delete ${selectedItems.length} selected resume(s)?`)) return

    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials
      if (!credentials) return

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      for (const item of selectedItems) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: awsConfig.bucketName,
            Key: item.key
          })
        )
      }

      setSelectedItems([])
      await loadResumes()
    } catch (err) {
      console.error('Failed to delete resumes:', err)
    }
  }


  const uploadResumes = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    try {
      const session = await fetchAuthSession()
      const credentials = session.credentials
      if (!credentials) return

      const s3Client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
      })

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const timestamp = Date.now()
        const key = `uploads/${userId}/${timestamp}-${file.name}`

        const content = await file.text()
        await s3Client.send(
          new PutObjectCommand({
            Bucket: awsConfig.bucketName,
            Key: key,
            Body: content,
            ContentType: 'text/markdown'
          })
        )
      }

      setSelectedFiles(null)
      await loadResumes()
    } catch (err) {
      console.error('Failed to upload resumes:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header variant="h3" description="Upload additional resumes to your library">
            Upload Resumes
          </Header>
        }
      >
        <SpaceBetween size="m">
          <FileUpload
            onChange={({ detail }) => setSelectedFiles(detail.value as any)}
            value={selectedFiles ? Array.from(selectedFiles) : []}
            i18nStrings={{
              uploadButtonText: e => e ? "Choose files" : "Choose file",
              dropzoneText: e => e ? "Drop files to upload" : "Drop file to upload",
              removeFileAriaLabel: e => `Remove file ${e + 1}`,
              limitShowFewer: "Show fewer files",
              limitShowMore: "Show more files",
              errorIconAriaLabel: "Error"
            }}
            multiple
            accept=".md,.txt"
          />
          <Button 
            onClick={uploadResumes} 
            disabled={!selectedFiles || selectedFiles.length === 0}
            loading={uploading}
            variant="primary"
          >
            Upload to Library
          </Button>
        </SpaceBetween>
      </Container>

      <Container
        header={
          <Header
            variant="h2"
            description="View, download, and manage your uploaded resumes"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
              <Button 
                onClick={downloadAll} 
                disabled={selectedItems.length === 0}
                iconName="download"
              >
                Download Selected
              </Button>
              <Button 
                onClick={deleteAll} 
                disabled={selectedItems.length === 0}
              >
                Delete Selected
              </Button>
              <Button onClick={loadResumes} loading={loading}>
                Refresh
              </Button>
            </SpaceBetween>
          }
        >
          Resume Library
        </Header>
      }
    >
      <Table
        columnDefinitions={[
          {
            id: 'name',
            header: 'Name',
            cell: item => item.name,
            sortingField: 'name'
          },
          {
            id: 'size',
            header: 'Size',
            cell: item => `${(item.size / 1024).toFixed(1)} KB`
          },
          {
            id: 'lastModified',
            header: 'Last Modified',
            cell: item => item.lastModified.toLocaleString(),
            sortingField: 'lastModified'
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: item => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => downloadResume(item)} iconName="download">Download</Button>
                <Button onClick={() => printResumePDF(item)} iconName="file">PDF</Button>
                <Button onClick={() => deleteResume(item)}>Delete</Button>
              </SpaceBetween>
            )
          }
        ]}
        items={resumes}
        loading={loading}
        loadingText="Loading resumes..."
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
        selectionType="multi"
        empty={
          <Box textAlign="center" color="inherit">
            <b>No resumes</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              Upload a resume to get started
            </Box>
          </Box>
        }
      />
    </Container>
    </SpaceBetween>
  )
}
