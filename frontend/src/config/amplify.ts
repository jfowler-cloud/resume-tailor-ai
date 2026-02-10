// Amplify configuration
// Update these values after deploying Cognito
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_XXXXXXXXX',
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID || 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      loginWith: {
        email: true
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true
        }
      },
      allowGuestAccess: false,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true
      }
    }
  }
}

// AWS SDK configuration
export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  bucketName: import.meta.env.VITE_BUCKET_NAME || 'resume-tailor-831729228662',
  stateMachineArn: import.meta.env.VITE_STATE_MACHINE_ARN || 'arn:aws:states:us-east-1:831729228662:stateMachine:ResumeTailorWorkflow',
  tableName: import.meta.env.VITE_TABLE_NAME || 'ResumeTailorResults'
}
