// Single switch for the off-season placeholder. Flip to false to restore the
// full homepage (winners, gallery, sponsors) and its menus everywhere.
export const SHOW_SAVE_THE_DATE = true;

export type SiteLink = { label: string; href: string };

// Section links use "/#id" so they work from every page, not just "/".
export const NAV_LINKS: SiteLink[] = SHOW_SAVE_THE_DATE
  ? [
      { label: "About", href: "/#about" },
      { label: "Sponsors", href: "/#sponsors" },
      { label: "Contact", href: "/contact" },
    ]
  : [
      { label: "About", href: "/#about" },
      { label: "Winners", href: "/#winners" },
      { label: "Sponsors", href: "/#sponsors" },
      { label: "FAQ", href: "/#faq" },
      { label: "Contact", href: "/contact" },
    ];
