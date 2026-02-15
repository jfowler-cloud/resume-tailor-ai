import { fetchAuthSession } from 'aws-amplify/auth'
import type { AWSCredentials } from '@aws-amplify/core/internals/utils'

/**
 * Get AWS credentials with automatic retry on expiration.
 * Amplify caches tokens, but if they're expired this forces a refresh.
 */
export async function getCredentials(): Promise<AWSCredentials> {
  let session = await fetchAuthSession()
  let credentials = session.credentials

  if (!credentials) {
    // Force refresh if initial fetch returned no credentials
    session = await fetchAuthSession({ forceRefresh: true })
    credentials = session.credentials
  }

  if (!credentials) {
    throw new Error('Unable to obtain AWS credentials. Please sign in again.')
  }

  return credentials
}
