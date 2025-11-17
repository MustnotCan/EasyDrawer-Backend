function xmlEscape(str = "") {
  return String(str).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}
export function generateOpds(id, title, updated, ...entries) {
  const template = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>${xmlEscape(id)}</id>
  <title>${xmlEscape(title)}</title>
  <updated>${xmlEscape(updated)}</updated>
  ${entries.join("\n")}
</feed>`;
  return template.trim();
}
export function generateEntryFromFile(
  title,
  id,
  updated,
  fileLink,
  thumbnailLink,
) {
  return `<entry>
    <title>${xmlEscape(title)}</title>
    <id>${xmlEscape(id)}</id>
    <updated>${xmlEscape(updated)}</updated>
    <link href="${xmlEscape(fileLink)}" type="application/pdf" rel="http://opds-spec.org/acquisition"/>
    <link href="${xmlEscape(thumbnailLink)}" type="image/webp" rel="http://opds-spec.org/image"/>
    <link href="${xmlEscape(thumbnailLink)}" type="image/webp" rel="http://opds-spec.org/image/thumbnail"/>
  </entry>`;
}
