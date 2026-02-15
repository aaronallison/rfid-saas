import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Management | RFID Field Capture',
  description: 'Manage your RFID field capture team members and their permissions.',
};

export default function TeamPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
        <p className="text-gray-600">Manage your RFID field capture team members and their permissions.</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Team Members</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12" role="main" aria-labelledby="empty-state-heading">
            <div className="text-gray-400 mb-4">
              <svg 
                className="mx-auto h-12 w-12" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 id="empty-state-heading" className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
            <p className="text-gray-500 mb-6">Get started by inviting team members to collaborate on RFID field capture.</p>
            <button 
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => {
                // TODO: Implement team member invitation functionality
                console.log('Invite team member clicked');
              }}
              aria-label="Invite a new team member"
            >
              Invite Team Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}