import { Icons } from "@/components/icons";
import { siteConfig } from "@/lib/config";

export function Footer() {
  return (
    <footer className="flex flex-col gap-y-5 rounded-lg px-7 py-5 md:px-10 container mx-auto">
      <div className="flex items-center gap-x-2">
        <Icons.logo className="h-5 w-auto text-primary" />
        <h2 className="text-lg font-bold text-foreground">{siteConfig.name}</h2>
      </div>
      <div className="flex flex-col justify-between gap-y-5 md:flex-row md:items-center">
        <ul className="flex flex-col gap-x-5 gap-y-2 text-muted-foreground md:flex-row md:items-center">
          {siteConfig.footer.map((link) => (
            <li
              key={link.href}
              className="text-[15px]/normal font-medium text-muted-foreground transition-all duration-100 ease-linear hover:text-foreground hover:underline hover:underline-offset-4"
            >
              <a href={link.href}>{link.text}</a>
            </li>
          ))}
        </ul>
        <div className="text-sm font-medium tracking-tight text-muted-foreground">
          <p>Screens show sample data. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
