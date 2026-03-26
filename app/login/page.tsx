import LoginButton from './LoginButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ReadLog</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal article knowledge base</p>
        </div>

        {searchParams.error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            Sign-in failed. Please try again.
          </p>
        )}

        <LoginButton />

        <p className="text-xs text-gray-400">
          Single-user app. Your data is private and scoped to your account.
        </p>
      </div>
    </div>
  )
}
