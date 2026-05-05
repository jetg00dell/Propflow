export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">J Goodell Homes</p>
            <p className="text-base font-semibold text-[#1A2B4A]">Resident Portal</p>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
