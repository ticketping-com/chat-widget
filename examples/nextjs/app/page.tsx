'use client'

import { useState } from 'react'
import TicketpingWidget from '@/components/TicketpingWidget'

export default function Home() {
  const [widgetStatus, setWidgetStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [eventLog, setEventLog] = useState<string[]>([])
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Corp'
  })

  const logEvent = (event: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${event}${data ? `: ${JSON.stringify(data)}` : ''}`
    setEventLog(prev => [logEntry, ...prev.slice(0, 19)]) // Keep last 20 events
  }

  const openWidget = () => {
    if (window.TicketpingChat?.instance) {
      window.TicketpingChat.open()
    }
  }

  const closeWidget = () => {
    if (window.TicketpingChat?.instance) {
      window.TicketpingChat.close()
    }
  }

  const identifyUser = () => {
    if (window.TicketpingChat?.instance && userData.name && userData.email) {
      const userDataWithId = {
        ...userData,
        userJWT: 'your-actual-jwt-token-here' // Replace with real JWT from your auth system
      }

      window.TicketpingChat.identify(userDataWithId)
      logEvent('User identified', userDataWithId)
    }
  }

  return (
    <div className="container">
      <div className="section">
        <h1>Ticketping Chat Widget</h1>
        <p>Next.js Integration Example</p>

        {/* Widget Component */}
                  <TicketpingWidget
            appId="your-app-id"
            teamSlug="your-team-slug"
            teamLogoIcon="https://your-logo-url.com/logo.png"
            debug={true}
            onReady={() => {
              setWidgetStatus('ready')
              logEvent('Widget ready')
            }}
            onError={(error) => {
              setWidgetStatus('error')
              logEvent('Widget error', error)
            }}
            onOpen={() => logEvent('Widget opened')}
            onClose={() => logEvent('Widget closed')}
            onMessageSent={(message) => logEvent('Message sent', { text: message.messageText })}
            onMessageReceived={(message) => logEvent('Message received', { sender: message.sender })}
          />

        <div className={`status ${widgetStatus === 'ready' ? 'success' : widgetStatus === 'error' ? 'error' : 'info'}`}>
          Status: {widgetStatus === 'ready' ? '✅ Ready' : widgetStatus === 'error' ? '❌ Error' : '⏳ Loading...'}
        </div>

        <div className="controls">
          <button
            className="btn"
            onClick={openWidget}
            disabled={widgetStatus !== 'ready'}
          >
            Open Chat
          </button>
          <button
            className="btn secondary"
            onClick={closeWidget}
            disabled={widgetStatus !== 'ready'}
          >
            Close Chat
          </button>
        </div>
      </div>

      {/* User Identification */}
      <div className="section">
        <h2>User Identification</h2>
        <p>Identify users to enable authenticated conversations.</p>

        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={userData.name}
            onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter user name"
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={userData.email}
            onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter user email"
          />
        </div>

        <div className="form-group">
          <label>Company:</label>
          <input
            type="text"
            value={userData.company}
            onChange={(e) => setUserData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="Enter company name"
          />
        </div>

        <div className="controls">
          <button
            className="btn success"
            onClick={identifyUser}
            disabled={widgetStatus !== 'ready' || !userData.name || !userData.email}
          >
            Identify User
          </button>
        </div>
      </div>

      {/* Integration Code Example */}
              <div className="section">
            <h2>Copy-Paste Integration</h2>
            <p>This example works with both App Router and Pages Router. See the README for complete code.</p>

            <div className="code-block">
{`// Basic usage in any Next.js page
import TicketpingWidget from '@/components/TicketpingWidget'

export default function MyPage() {
  return (
    <div>
      <h1>My App</h1>

      <TicketpingWidget
        appId="your-app-id"
        teamSlug="your-team-slug"
        onReady={() => console.log('Widget ready!')}
      />
    </div>
  )
}`}
            </div>
        </div>

      {/* Events Log */}
      <div className="section">
        <h2>Events Log</h2>
        <div className="controls">
          <button className="btn secondary" onClick={() => setEventLog([])}>
            Clear Log
          </button>
        </div>

        <div className="event-log">
          {eventLog.length === 0 ? (
            'Widget events will appear here...'
          ) : (
            eventLog.join('\n')
          )}
        </div>
      </div>
    </div>
  )
}
