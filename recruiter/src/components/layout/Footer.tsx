export function Footer() {
  const pdfLinks = [
    { label: "Code of Conduct", href: "/Apronhanger_Recruiter_Code_of_Conduct.pdf" },
    { label: "Privacy Policy", href: "/Apronhanger_Recruiter_Privacy_Policy.pdf" },
    { label: "Terms & Conditions", href: "/Apronhanger_Recruiter_Terms_and_Conditions.pdf" },
  ];

  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <img
              src="/logo (1).webp"
              alt="ApronHanger Logo"
              className="h-7 w-7 object-contain rounded-lg shadow-soft"
            />
            <span className="text-sm font-semibold text-foreground">ApronHanger</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            ApronHanger acts as a professional networking and hiring facilitation platform and is
            not responsible for employment decisions.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-xs sm:flex-row sm:items-start sm:gap-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Legal & Policies
            </p>
            <ul className="mt-3 space-y-2">
              {pdfLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/70 transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-end">
            <a
              href="/who_are_we.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
            >
              Who We Are
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-6 py-4 text-[11px] text-muted-foreground md:flex-row">
          <p>© 2026 ApronHanger Technologies Pvt. Ltd. All rights reserved.</p>
          <p>Made for India's healthcare workforce.</p>
        </div>
      </div>
    </footer>
  );
}
