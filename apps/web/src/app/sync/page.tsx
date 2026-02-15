import FeatureGate from '@/components/FeatureGate'

export default function SyncPage() {
  const orgId = 'org_1' // Mock org ID

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">RFID Data Sync</h1>
          
          <FeatureGate orgId={orgId} feature="sync">
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-green-800">Sync Active</h3>
                <p className="mt-2 text-sm text-green-700">
                  Your RFID data is being synchronized in real-time.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900">Last Sync</h4>
                  <p className="text-sm text-gray-500">2 minutes ago</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900">Records Synced</h4>
                  <p className="text-sm text-gray-500">1,234</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900">Status</h4>
                  <p className="text-sm text-green-600">Online</p>
                </div>
              </div>

              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Force Sync Now
              </button>
            </div>
          </FeatureGate>
        </div>
      </div>
    </div>
  )
}