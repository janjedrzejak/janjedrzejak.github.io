import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const collections = [
  ["Półka ważnych dla mnie książek", "personal-books.json"],
  ["Półka inżynierska", "books.json"],
];
const ids = new Set();
const lines = [
  "# Wydania i źródła okładek",
  "",
  "ISBN odnosi się do podanego wydania drukowanego. Nowa kolekcja wyświetla okładki z serwisów wydawców i dystrybutorów. Lokalnie zapisane grafiki wcześniejszej kolekcji mają opis źródła i sposobu użycia przy książce.",
  "",
];

for (const [name, file] of collections) {
  const books = JSON.parse(
    readFileSync(new URL("../src/data/" + file, import.meta.url), "utf8"),
  );
  const sources = [];
  lines.push(
    "## " + name,
    "",
    "| Nr | Tytuł | Autorzy / redaktorzy | Wydanie | Rok | ISBN-13 |",
    "|---:|---|---|---|---:|---|",
  );

  for (const [i, book] of books.entries()) {
    if (
      ids.has(book.id) ||
      !/^[a-z0-9-]+$/.test(book.id) ||
      book.number !== i + 1
    ) {
      throw new Error("Duplicate, malformed or unordered book " + book.id);
    }
    ids.add(book.id);
    if (
      !/^\d{13}$/.test(book.isbn) ||
      [...book.isbn].reduce(
        (sum, digit, n) => sum + Number(digit) * (n % 2 ? 3 : 1),
        0,
      ) % 10
    ) {
      throw new Error("Invalid ISBN " + book.id);
    }
    const c = book.cover;
    if (
      !book.authors.length ||
      !book.description ||
      !book.official.startsWith("https://") ||
      !c.alt ||
      !c.source.startsWith("https://") ||
      c.size.some((side) => side < 100)
    ) {
      throw new Error("Incomplete metadata " + book.id);
    }
    const title = book.title + (book.subtitle ? " — " + book.subtitle : "");
    const authors =
      (book.credit === "Editors" ? "red. " : "") + book.authors.join(", ");
    lines.push(
      "| " +
        [book.number, title, authors, book.edition, book.year, book.isbn].join(
          " | ",
        ) +
        " |",
    );
    sources.push(
      "### " + book.title,
      "",
      book.description,
      "",
      "- " +
        book.publisher +
        " · " +
        book.edition +
        " · ISBN " +
        book.isbn +
        ".",
      "- [Opis książki](" +
        book.official +
        ") · [Źródło wydania](" +
        book.editionSource +
        ")",
      "- " +
        c.provider +
        " · " +
        c.size.join(" × ") +
        " px. [Grafika](" +
        c.source +
        ") · [Źródło i uznanie](" +
        c.attribution +
        ")",
      "- " + c.usage.trim() + " " + c.difference.trim(),
    );
    if (c.rightsUrl !== c.attribution)
      sources.push("- [Warunki źródła](" + c.rightsUrl + ")");
    if (book.editionNote) sources.push("- " + book.editionNote);
    if (c.src.startsWith("https://")) {
      sources.push("- Wyświetlany adres. " + c.src);
    } else {
      const path = new URL("../public/" + c.src, import.meta.url);
      if (!existsSync(path)) throw new Error("Missing local cover " + book.id);
      const digest = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      sources.push("- Lokalny plik " + c.src + " · SHA-256 " + digest + ".");
    }
    sources.push("");
  }
  lines.push("", ...sources);
}
writeFileSync(
  new URL("../docs/KATALOG.md", import.meta.url),
  lines.join("\n").trimEnd() + "\n",
);
