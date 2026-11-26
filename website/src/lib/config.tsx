import {
  ArrowLeftRightIcon,
  ChartColumnIcon,
  CoinsIcon,
  LockIcon,
  RepeatIcon,
  WalletIcon,
} from "lucide-react";

import { download } from "@/lib/release";

export const BLUR_FADE_DELAY = 0.15;

export const siteConfig = {
  name: "Peppercorn",
  description: "Know where your money goes.",
  tagline:
    "A simple money tracker for Android. Add what you spend in seconds, stay on budget, and see what your gold, silver and funds are worth today.",
  // Peppercorn's launch page. The badge is a copy kept here, so visitors reach Product Hunt only if they click it.
  productHunt: "https://www.producthunt.com/posts/peppercorn-2",
  cta: download ? "Download for Android" : "Coming soon for Android",
  ctaHref: download?.href ?? "#cta",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  keywords: [
    "Budget app",
    "Expense tracker",
    "Money tracker",
    "Android budget app",
    "Gold price tracker",
    "Personal finance India",
  ],
  features: [
    {
      name: "Entries in seconds",
      description:
        "Type an amount, tap a category, done. Past notes are suggested as you type.",
      icon: <ArrowLeftRightIcon className="h-6 w-6" />,
      href: "#feature-highlight",
    },
    {
      name: "Budgets that guide you",
      description:
        "One for everything or one per category, with what’s safe to spend each day.",
      icon: <WalletIcon className="h-6 w-6" />,
      href: "#feature-highlight",
    },
    {
      name: "Insights in plain words",
      description:
        "How this month compares, what stands out, and where the money went.",
      icon: <ChartColumnIcon className="h-6 w-6" />,
      href: "#feature-highlight",
    },
    {
      name: "Gold, silver and funds",
      description:
        "Enter grams or rupees. Values follow the latest prices, checked daily.",
      icon: <CoinsIcon className="h-6 w-6" />,
      href: "#bento",
    },
    {
      name: "Repeating entries",
      description:
        "Rent, salary, subscriptions: set them once and they add themselves.",
      icon: <RepeatIcon className="h-6 w-6" />,
      href: "#bento",
    },
    {
      name: "Private by design",
      description:
        "No account needed, and no ads. Sign in with Google only if you want a copy in your own Drive.",
      icon: <LockIcon className="h-6 w-6" />,
      href: "#faq",
    },
  ],
  featureHighlight: [
    {
      title: "Add it in seconds",
      description:
        "A big number pad, your categories one tap away, and Undo if you change your mind.",
      imageSrc: "/Device-2.png",
      direction: "rtl" as const,
    },
    {
      title: "Stay on budget",
      description:
        "See what’s left, whether you’re spending too fast, and what’s safe to spend each day.",
      imageSrc: "/Device-4.png",
      direction: "ltr" as const,
    },
    {
      title: "See where it goes",
      description:
        "Weeks, months and years compared with the same stretch before, so you know if it’s a lot.",
      imageSrc: "/Device-1.png",
      direction: "rtl" as const,
    },
  ],
  bento: [
    {
      title: "Your month at a glance",
      content:
        "What you’ve spent, what came in, what’s left of your budget, and your latest entries, all on the first screen.",
      imageSrc: "/Device-3.png",
      imageAlt: "Peppercorn’s home screen with this month’s spending and recent entries",
      fullWidth: true,
    },
    {
      title: "Assets, valued daily",
      content:
        "Gold and silver at the Chennai rate, and the Taurus and Tata Ethical funds at their closing price.",
      imageSrc: "/Device-5.png",
      imageAlt: "The Assets tab with gold, silver and two funds",
      fullWidth: false,
    },
    {
      title: "Every entry, easy to find",
      content:
        "History by month with what’s coming up next. Filter it, search it, or export it all as a CSV file.",
      imageSrc: "/Device-6.png",
      imageAlt: "History with an upcoming rent payment and this month’s entries",
      fullWidth: false,
    },
    {
      title: "Easy on the eyes at night",
      content:
        "Light, dark, or whatever your phone uses. Same calm design, nothing shouting for attention.",
      imageSrc: "/Device-9.png",
      imageAlt: "Peppercorn’s home screen in the dark theme",
      fullWidth: true,
    },
  ],
  benefits: [
    {
      id: 1,
      text: "Buy gold or silver and just type the grams.",
      image: "/Device-7.png",
    },
    {
      id: 2,
      text: "See what you paid, what it’s worth, and the gain.",
      image: "/Device-8.png",
    },
    {
      id: 3,
      text: "Look back over every month, and at what’s due next.",
      image: "/Device-6.png",
    },
    {
      id: 4,
      text: "Make it yours: categories, currency, payday and theme.",
      image: "/Device-10.png",
    },
  ],
  pricing: [
    {
      name: "Peppercorn",
      price: "₹0",
      period: "for everything",
      features: [
        "Unlimited entries and categories",
        "Budgets and insights",
        "Gold, silver and two funds",
        "Repeating entries",
        "CSV export",
        "No ads, no account needed",
      ],
      description: "Everything you need to keep track",
    },
    {
      name: "With your Google account",
      price: "₹0",
      period: "for everything",
      features: [
        "Everything in Peppercorn",
        "Saved to your own Google Drive",
        "Comes back when you sign in again",
        "Delete it from the app whenever you like",
      ],
      description: "Optional: sign in to keep a copy",
    },
  ],
  faqs: [
    {
      question: "How do I install it?",
      answer: download ? (
        <span>
          <a
            href={download.href}
            download
            className="text-primary underline underline-offset-4"
          >
            Download the file
          </a>{" "}
          on your Android phone and open it. If your phone asks, allow your
          browser to install apps. Play Protect may offer to scan it first,
          which is fine. Peppercorn isn’t on the Play Store, so come back here
          for new versions. Install them over the old one and your entries
          stay.
        </span>
      ) : (
        <span>
          The Android app isn’t ready to download yet, but you can{" "}
          <a href="/app" className="text-primary underline underline-offset-4">
            try it in your browser
          </a>
          . What you add there stays in that browser.
        </span>
      ),
    },
    {
      question: "Is it free?",
      answer: (
        <span>
          Yes, with no ads.
        </span>
      ),
    },
    {
      question: "Do I need an account?",
      answer: (
        <span>
          No. You can use everything without one. Signing in with Google is
          optional, and only keeps a copy in a hidden folder of your own Google
          Drive, so your entries come back on a new phone.
        </span>
      ),
    },
    {
      question: "Where is my data kept?",
      answer: (
        <span>
          On your phone. Without an account, your entries don’t leave it. To
          show daily prices, the app asks two public websites for them, without
          sending your entries.
        </span>
      ),
    },
    {
      question: "How are gold, silver and funds priced?",
      answer: (
        <span>
          Gold (22K) and silver use the Chennai rate per gram. The two funds use
          their closing price, for the Direct Growth plans. Prices are checked
          about once a day, so they’re a guide, not a quote.
        </span>
      ),
    },
    {
      question: "Does it connect to my bank?",
      answer: (
        <span>
          No. You add what you spend yourself, and Peppercorn makes that quick.
          It never asks for bank or card details.
        </span>
      ),
    },
    {
      question: "Can I use another currency?",
      answer: (
        <span>
          Yes, there are 150 to choose from. Asset prices are in rupees, so
          assets are added when your currency is the Indian rupee.
        </span>
      ),
    },
    {
      question: "Is there an iPhone version?",
      answer: <span>Not now. Peppercorn is for Android first.</span>,
    },
  ],
  footer: [
    { href: "#feature-highlight", text: "Features" },
    { href: "#pricing", text: "Pricing" },
    { href: "#faq", text: "FAQ" },
    { href: "/privacy", text: "Privacy" },
  ],
};

export type SiteConfig = typeof siteConfig;
