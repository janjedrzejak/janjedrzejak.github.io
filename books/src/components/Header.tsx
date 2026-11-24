import { portfolio, shelfQuery, technicalShelf } from "../data/catalog";

export function Header({ catalog = false }: { catalog?: boolean }) {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <a
          className="brand"
          href={portfolio}
          aria-label="Jan Jędrzejak — portfolio"
        >
          <span aria-hidden="true" className="brand-mark">
            JJ
          </span>
          <span>Jan Jędrzejak</span>
        </a>
        <nav className="navigation" aria-label="Biblioteka">
          <a
            href={"./" + shelfQuery}
            aria-current={catalog ? undefined : "page"}
          >
            {technicalShelf ? "Inżynieria" : "Półka"}
          </a>
          <a
            href={"./catalog.html" + shelfQuery}
            aria-current={catalog ? "page" : undefined}
          >
            Katalog
          </a>
          <a className="portfolio-link" href={portfolio}>
            Portfolio
          </a>
        </nav>
      </div>
    </header>
  );
}
