import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <h1 className="text-4xl font-bold">RFID Field Capture + Sync SaaS</h1>
        </div>
      </div>

      <div className="relative flex place-items-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl text-center">
            Subscription-based RFID field capture and sync platform
          </p>
          <div className="flex gap-4">
            <Link
              href="/billing"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              View Billing
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}