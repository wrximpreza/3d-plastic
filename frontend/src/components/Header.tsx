export function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
      <div className="flex items-center gap-2">
        {/* ePlast Logo */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3h18v18H3V3z" fill="#1F2937" />
          <path d="M6 8h12M6 12h8M6 16h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-base font-semibold text-gray-900">ePlast</span>
      </div>
    </header>
  )
}

