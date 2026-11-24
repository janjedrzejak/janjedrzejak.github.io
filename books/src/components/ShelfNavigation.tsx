import { shelfHref, shelfId, shelves } from "../data/catalog";

export function ShelfNavigation({ catalog = false }: { catalog?: boolean }) {
  return (
    <nav className="library-nav" aria-label="Nawigacja półek">
      <select
        className="shelf-select"
        aria-label="Wybierz półkę"
        value={shelfId}
        onChange={(event) => location.assign(shelfHref(event.target.value, catalog))}
      >
        {shelves.map((shelf) => (
          <option key={shelf.id} value={shelf.id}>
            {shelf.label}
          </option>
        ))}
      </select>
      <a className="collection-link" href={shelfHref(shelfId, !catalog)}>
        {catalog ? "Półka" : "Katalog"}
      </a>
    </nav>
  );
}
