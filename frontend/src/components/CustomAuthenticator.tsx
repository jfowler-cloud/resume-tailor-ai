import { Authenticator, useTheme, View, Image, Text, Heading } from '@aws-amplify/ui-react'

export function CustomAuthenticator({ children }: { children: any }) {
  const components = {
    Header() {
      const { tokens } = useTheme()

      return (
        <View textAlign="center" padding={tokens.space.large}>
          <Image
            alt="Resume Tailor AI"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23232f3e' stroke-width='2'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpolyline points='14 2 14 8 20 8'/%3E%3Cpath d='M12 18v-6M9 15l3 3 3-3'/%3E%3C/svg%3E"
            width="80px"
            height="80px"
          />
          <Heading level={3} marginTop={tokens.space.medium}>
            Resume Tailor AI
          </Heading>
          <Text fontSize="small" color={tokens.colors.font.secondary}>
            AI-Powered Resume Optimization with Claude Opus 4.5
          </Text>
        </View>
      )
    },

    Footer() {
      const { tokens } = useTheme()

      return (
        <View textAlign="center" padding={tokens.space.large}>
          <Text fontSize="small" color={tokens.colors.font.secondary}>
            🔒 Secure authentication powered by AWS Cognito
          </Text>
          <View marginTop={tokens.space.medium}>
            <Text fontSize="small" color={tokens.colors.font.tertiary}>
              <strong>Need access?</strong> This is a demo application.
            </Text>
            <Text fontSize="small" color={tokens.colors.font.tertiary}>
              Contact me for onboarding or view the{' '}
              <a 
                href="https://github.com/jfowler-cloud/resume-tailor-ai" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0972d3' }}
              >
                GitHub repository
              </a>
              {' '}for screenshots and documentation.
            </Text>
          </View>
          <View marginTop={tokens.space.small}>
            <Text fontSize="x-small" color={tokens.colors.font.tertiary}>
              Built with AWS, React 19, and Claude Opus 4.5
            </Text>
          </View>
        </View>
      )
    },
  }

  const formFields = {
    signIn: {
      username: {
        placeholder: 'Enter your email',
        label: 'Email',
      },
      password: {
        placeholder: 'Enter your password',
        label: 'Password',
      },
    },
  }

  return (
    <Authenticator
      hideSignUp={true}
      components={components}
      formFields={formFields}
    >
      {children}
    </Authenticator>
  )
}
