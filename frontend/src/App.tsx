import { useState, useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import AppLayout from '@cloudscape-design/components/app-layout'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import { applyMode, Mode } from '@cloudscape-design/global-styles'
import Dashboard from './components/Dashboard'
import { amplifyConfig } from './config/amplify'

// Configure Amplify
Amplify.configure(amplifyConfig)

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    const mode: Mode = darkMode ? Mode.Dark : Mode.Light
    applyMode(mode)
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={{ height: '100vh' }}>
          <TopNavigation
            identity={{
              href: '/',
              title: 'Resume Tailor',
              logo: {
                src: '/logo.svg',
                alt: 'Resume Tailor'
              }
            }}
            utilities={[
              {
                type: 'button',
                text: darkMode ? '☀️ Light' : '🌙 Dark',
                onClick: toggleDarkMode
              },
              {
                type: 'menu-dropdown',
                text: user?.signInDetails?.loginId || 'User',
                description: user?.signInDetails?.loginId,
                iconName: 'user-profile',
                items: [
                  { id: 'profile', text: 'Profile' },
                  { id: 'settings', text: 'Settings' },
                  { id: 'signout', text: 'Sign out' }
                ],
                onItemClick: ({ detail }) => {
                  if (detail.id === 'signout') {
                    signOut?.()
                  }
                }
              }
            ]}
          />
          <AppLayout
            navigationHide
            toolsHide
            content={<Dashboard user={user} />}
          />
        </div>
      )}
    </Authenticator>
  )
}

export default App
