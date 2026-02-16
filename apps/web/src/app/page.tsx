import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scan, Sync, Building2, Smartphone, Database, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            RFID Field Capture
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete RFID field capture and synchronization platform for efficient data collection and management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/login">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need for RFID data capture
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Streamline your field operations with our comprehensive RFID platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-primary/20">
            <CardHeader>
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <Scan className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Field Capture</CardTitle>
              <CardDescription>
                Capture RFID data efficiently in the field with our mobile application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use your mobile device to scan and record RFID tags with location data, 
                batch management, and offline capabilities.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <Sync className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Real-time Sync</CardTitle>
              <CardDescription>
                Seamlessly synchronize your captured data across all devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatic synchronization ensures your data is always up-to-date 
                across web and mobile platforms.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Multi-Organization</CardTitle>
              <CardDescription>
                Manage multiple organizations and teams from a single platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and manage separate workspaces for different projects, 
                clients, or departments with role-based access control.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Mobile First</CardTitle>
              <CardDescription>
                Native mobile experience optimized for field operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Purpose-built mobile application with offline support, 
                GPS integration, and intuitive field worker interface.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Secure Storage</CardTitle>
              <CardDescription>
                Enterprise-grade data storage and management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your data is securely stored with automated backups, 
                encryption, and comprehensive audit trails.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Enterprise Security</CardTitle>
              <CardDescription>
                Built with security and compliance in mind
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Role-based access control, data encryption, and 
                compliance-ready security features.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to streamline your RFID operations?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join teams who trust our platform for their field data capture needs
            </p>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/login">Start Your Free Trial</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2024 RFID Field Capture. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}