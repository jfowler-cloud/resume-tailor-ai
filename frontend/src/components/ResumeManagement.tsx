import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import Button from '@cloudscape-design/components/button'
import Box from '@cloudscape-design/components/box'
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

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="View, download, and manage your uploaded resumes"
          actions={
            <Button onClick={loadResumes} loading={loading}>
              Refresh
            </Button>
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
                <Button onClick={() => downloadResume(item)}>Download</Button>
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
  )
}
