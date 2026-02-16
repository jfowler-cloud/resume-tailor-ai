import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCredentials } from '../auth'
import { fetchAuthSession } from 'aws-amplify/auth'

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn()
}))

describe('getCredentials', () => {
  const mockCredentials = {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    sessionToken: 'session-token-123',
    expiration: new Date(Date.now() + 3600000)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns credentials on successful fetch', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials
    } as any)

    const result = await getCredentials()

    expect(result).toEqual(mockCredentials)
    expect(fetchAuthSession).toHaveBeenCalledTimes(1)
  })

  it('force refreshes when initial fetch returns no credentials', async () => {
    vi.mocked(fetchAuthSession)
      .mockResolvedValueOnce({ credentials: undefined } as any)
      .mockResolvedValueOnce({ credentials: mockCredentials } as any)

    const result = await getCredentials()

    expect(result).toEqual(mockCredentials)
    expect(fetchAuthSession).toHaveBeenCalledTimes(2)
    expect(fetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true })
  })

  it('throws error when no credentials available after refresh', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: undefined
    } as any)

    await expect(getCredentials()).rejects.toThrow('Unable to obtain AWS credentials')
  })

  it('throws error with sign in message', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: undefined
    } as any)

    await expect(getCredentials()).rejects.toThrow('Please sign in again')
  })

  it('handles session with null credentials', async () => {
    vi.mocked(fetchAuthSession)
      .mockResolvedValueOnce({ credentials: null } as any)
      .mockResolvedValueOnce({ credentials: mockCredentials } as any)

    const result = await getCredentials()

    expect(result).toEqual(mockCredentials)
  })

  it('passes credentials directly without modification', async () => {
    const specialCredentials = {
      accessKeyId: 'special-key',
      secretAccessKey: 'special-secret',
      sessionToken: 'special-token',
      expiration: new Date()
    }

    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: specialCredentials
    } as any)

    const result = await getCredentials()

    expect(result).toBe(specialCredentials)
  })

  it('propagates errors from fetchAuthSession', async () => {
    vi.mocked(fetchAuthSession).mockRejectedValue(new Error('Network error'))

    await expect(getCredentials()).rejects.toThrow('Network error')
  })

  it('handles expired session by forcing refresh', async () => {
    const expiredCredentials = {
      ...mockCredentials,
      expiration: new Date(Date.now() - 1000) // Expired
    }

    // First call returns expired, second returns fresh
    vi.mocked(fetchAuthSession)
      .mockResolvedValueOnce({ credentials: undefined } as any)
      .mockResolvedValueOnce({ credentials: mockCredentials } as any)

    const result = await getCredentials()

    expect(result).toEqual(mockCredentials)
    expect(fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true })
  })

  it('only calls forceRefresh once', async () => {
    vi.mocked(fetchAuthSession)
      .mockResolvedValueOnce({ credentials: undefined } as any)
      .mockResolvedValueOnce({ credentials: undefined } as any)

    await expect(getCredentials()).rejects.toThrow()

    // Should only be called twice total (initial + one force refresh)
    expect(fetchAuthSession).toHaveBeenCalledTimes(2)
  })

  it('returns credentials with all required fields', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      credentials: mockCredentials
    } as any)

    const result = await getCredentials()

    expect(result).toHaveProperty('accessKeyId')
    expect(result).toHaveProperty('secretAccessKey')
    expect(result).toHaveProperty('sessionToken')
  })
})
