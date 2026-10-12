export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span aria-hidden className="grid size-8 grid-cols-2 gap-0.5 rounded-md bg-primary p-1.5">
            <span className="rounded-[1px] bg-primary-foreground" />
            <span className="rounded-[1px] bg-primary-foreground/40" />
            <span className="rounded-[1px] bg-primary-foreground/40" />
            <span className="rounded-[1px] bg-primary-foreground" />
          </span>
          <span className="font-semibold tracking-tight">Creator Dashboard</span>
        </div>
        {children}
      </div>
    </main>
  )
}
