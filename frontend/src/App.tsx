import { useState, useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { CustomAuthenticator } from './components/CustomAuthenticator'
import '@aws-amplify/ui-react/styles.css'
import './App.css'
import AppLayout from '@cloudscape-design/components/app-layout'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import { applyMode, Mode } from '@cloudscape-design/global-styles'
import Dashboard from './components/Dashboard'
import { amplifyConfig } from './config/amplify'

// Configure Amplify
Amplify.configure(amplifyConfig as any)

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
    <CustomAuthenticator>
      {({ signOut, user }: any) => (
        <div style={{ height: '100vh' }}>
          <TopNavigation
            identity={{
              href: '/',
              title: 'Resume Tailor AI',
              logo: {
                src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Cpath d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/%3E%3Cpolyline points="14 2 14 8 20 8"/%3E%3Cpath d="M12 18v-6M9 15l3 3 3-3"/%3E%3C/svg%3E',
                alt: 'Resume Tailor AI'
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
    </CustomAuthenticator>
  )
}

export default App
