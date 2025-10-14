'use client'

import { useState } from 'react'
import { config } from '@/lib/env'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ApiSetupGuide() {
  const [isVisible, setIsVisible] = useState(true)
  const isPlaceholder = config.apiUrl.includes('placeholder')
  
  if (!isPlaceholder || !isVisible) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                {config.appName} <Badge variant="outline">Demo Mode</Badge>
              </CardTitle>
              <CardDescription>
                API server not configured. Set up your backend to unlock full functionality.
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-2">Current Configuration</h3>
            <p className="text-sm text-amber-700 font-mono bg-amber-100 px-2 py-1 rounded">
              NEXT_PUBLIC_API_URL={config.apiUrl}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Quick Setup Options:</h3>
            
            <div className="grid gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Option 1: Configure Environment Variable</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Set the API URL in your Vercel dashboard or environment configuration.
                </p>
                <div className="bg-gray-50 rounded p-2 font-mono text-sm">
                  NEXT_PUBLIC_API_URL=https://your-api-domain.com
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Option 2: Deploy the Backend</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  The backend Go API is ready for deployment. Deploy it to a service like:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Railway (recommended for Go apps)</li>
                  <li>• Fly.io</li> 
                  <li>• Google Cloud Run</li>
                  <li>• Heroku</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Option 3: Use Mock Server (Development)</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  For testing, you can use the included mock server:
                </p>
                <div className="bg-gray-50 rounded p-2 font-mono text-sm">
                  cd tracr && node mock-api-server.js
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">What works without API:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✓ Application UI and routing</li>
              <li>✓ Component demonstrations</li>
              <li>✗ User authentication</li>
              <li>✗ Data management</li>
              <li>✗ Device monitoring</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => setIsVisible(false)}
              variant="outline"
              className="flex-1"
            >
              Continue in Demo Mode
            </Button>
            <Button 
              onClick={() => window.open('https://github.com/tulsie-narine/tracr/blob/main/DEPLOYMENT.md', '_blank')}
              className="flex-1"
            >
              View Setup Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}