export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-transparent p-0 selection:bg-violet-500/30">
      {children}
    </div>
  )
}
