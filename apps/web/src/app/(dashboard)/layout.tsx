import { ReactNode } from 'react'

export interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header 
        className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                RFID Dashboard
              </h1>
            </div>
            
            <nav className="hidden md:flex space-x-8" aria-label="Main navigation">
              <a 
                href="/dashboard" 
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                aria-current="page"
              >
                Dashboard
              </a>
              <a 
                href="/devices" 
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Devices
              </a>
              <a 
                href="/data" 
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Data
              </a>
            </nav>
          </div>
        </div>
      </header>
      
      <main 
        className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8"
        role="main"
      >
        {children}
      </main>
    </div>
  )
}