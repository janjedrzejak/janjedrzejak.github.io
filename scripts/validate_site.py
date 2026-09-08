#!/usr/bin/env python3
"""Fail publication on missing content, broken local links or inconsistent SEO."""
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from collections import Counter
import json
import hashlib
from lxml import etree, html
from build_site import OUT, ORIGIN, PAGES, ARTICLES, url_for


def validate():
    errors = []
    docs = {p.relative_to(OUT).as_posix(): html.document_fromstring(p.read_text()) for p in OUT.rglob("*.html")}
    titles = []
    descriptions = []
    expected_urls = set()
    chat_css = OUT / "chatbot.css"
    chat_css_version = hashlib.sha256(chat_css.read_bytes()).hexdigest()[:10] if chat_css.is_file() else None

    def check(condition, message):
        if not condition:
            errors.append(message)

    for path, doc in docs.items():
        check(len(doc.xpath('//h1')) == 1, f"{path}: expected one H1")
        ids = doc.xpath('//*[@id]/@id')
        check(len(ids) == len(set(ids)), f"{path}: duplicate IDs")
        check(not doc.xpath('//*[@data-en or @data-pl or @data-i18n]'), f"{path}: untranslated content")
        if any(urlsplit(src).path == "/chatbot.js" for src in doc.xpath('//script[@src]/@src')):
            chat_links = doc.xpath('//head/link[@id="portfolio-chat-styles"]')
            check(len(chat_links) == 1, f"{path}: expected one chat stylesheet in head")
            check(chat_css_version is not None, f"{path}: missing chat stylesheet asset")
            if len(chat_links) == 1 and chat_css_version is not None:
                check(chat_links[0].get("rel") == "stylesheet", f"{path}: chat link is not a stylesheet")
                check(chat_links[0].get("href") == "/chatbot.css?v=" + chat_css_version, f"{path}: stale or invalid chat stylesheet URL")
        for element in doc.xpath('//*[@href or @src]'):
            for attr in ("href", "src"):
                value = element.get(attr)
                if not value or value.startswith(("mailto:", "tel:", "data:", "javascript:")):
                    continue
                url = urlsplit(urljoin(ORIGIN + "/" + path, value))
                if url.netloc != urlsplit(ORIGIN).netloc:
                    continue
                target = unquote(url.path).lstrip("/")
                if not target or target.endswith("/"):
                    target += "index.html"
                check((OUT / target).is_file(), f"{path}: missing local resource {value}")
                if url.fragment and target in docs:
                    check(unquote(url.fragment) in docs[target].xpath('//*[@id]/@id'), f"{path}: broken fragment {value}")

        if path in ("404.html", "ksiazka-nfc.html"):
            check("noindex" in " ".join(doc.xpath('//meta[@name="robots"]/@content')), f"{path}: utility page must remain noindex")
            continue
        language = "pl" if path.startswith("pl/") else "en"
        source = path.removeprefix("pl/")
        canonical = url_for(source, language)
        check(doc.get("lang") == language, f"{path}: wrong document language")
        check(doc.xpath('//link[@rel="canonical"]/@href') == [canonical], f"{path}: wrong canonical")
        alternates = {e.get("hreflang"): e.get("href") for e in doc.xpath('//head/link[@hreflang]')}
        check(alternates == {lang: url_for(source, "en" if lang == "x-default" else lang) for lang in ("en", "pl", "x-default")}, f"{path}: wrong language alternates")
        title = doc.xpath('//title/text()')
        description = doc.xpath('//meta[@name="description"]/@content')
        check(len(title) == 1 and 10 <= len(title[0]) <= 95, f"{path}: invalid title")
        check(len(description) == 1 and 50 <= len(description[0]) <= 220, f"{path}: invalid description")
        titles.extend(title)
        descriptions.extend(description)
        check(not any(c in title[0] for c in '—–'), f"{path}: long dash in title")
        check(doc.xpath('//meta[@property="og:title"]/@content') == title, f"{path}: Open Graph title mismatch")
        check(doc.xpath('//meta[@name="twitter:title"]/@content') == title, f"{path}: Twitter title mismatch")
        check(doc.xpath('//meta[@property="og:url"]/@content') == [canonical], f"{path}: Open Graph URL mismatch")
        check(bool(doc.xpath('//noscript/style')), f"{path}: content must remain visible without JavaScript")
        robots = " ".join(doc.xpath('//meta[@name="robots"]/@content'))
        if "noindex" not in robots:
            expected_urls.add(canonical)
        scripts = doc.xpath('//script[@type="application/ld+json"]')
        check(len(scripts) == 1, f"{path}: expected one structured graph")
        graph = json.loads(scripts[0].text)["@graph"]
        pages = [n for n in graph if n.get("@type") in ("WebPage", "ProfilePage", "CollectionPage")]
        check(len(pages) == 1 and pages[0]["url"] == canonical and pages[0]["inLanguage"] == language, f"{path}: schema page mismatch")
        if source in ARTICLES:
            article = next(n for n in graph if n.get("@type") == "BlogPosting")
            check(article["headline"] == doc.xpath('//h1')[0].text_content(), f"{path}: schema headline mismatch")
            check(article["datePublished"] <= article["dateModified"], f"{path}: invalid dates")
            check(article["dateModified"] in doc.xpath('//time/@datetime'), f"{path}: modification date not visible")
            content = doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," article-content ")]')[0]
            check(len(content.text_content().split()) >= 230, f"{path}: article body missing")
            check(bool(doc.xpath('//nav[contains(@class,"article-toc")]')), f"{path}: missing table of contents")
    for label, values in (("titles", titles), ("descriptions", descriptions)):
        check(not [v for v,c in Counter(values).items() if c > 1], f"Duplicate {label}")
    xml = etree.parse(str(OUT / "sitemap.xml"))
    sitemap_urls = xml.xpath('//*[local-name()="loc"]/text()')
    check(len(sitemap_urls) == len(set(sitemap_urls)), "Duplicate sitemap URL")
    check(set(sitemap_urls) == expected_urls, "Sitemap does not match indexable canonical URLs")
    check(ORIGIN + "/sitemap.xml" in (OUT / "robots.txt").read_text(), "robots.txt sitemap missing")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"PASS: {len(docs)} pages; {len(expected_urls)} indexable URLs; local links, fragments, metadata, languages, structured data and sitemap.")


if __name__ == "__main__":
    validate()
