export function Footer() {
  const pdfLinks = [
    { label: "About", href: "/APRONHANGER_About.pdf" },
    { label: "Code of Conduct", href: "/APRONHANGER_Code_of_Conduct.pdf" },
    { label: "Privacy Policy", href: "/APRONHANGER_Work_Privacy_Policy.pdf" },
    { label: "Terms & Conditions", href: "/APRONHANGER_Work_Terms_and_Conditions.pdf" },
  ];

  return (
    <footer className="mt-16 border-t bg-surface">
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
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Support
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              support@apronhanger.work
            </p>
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
