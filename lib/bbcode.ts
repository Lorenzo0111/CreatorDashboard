/**
 * Converts between Markdown, which the dashboard stores, and the XenForo-style BBCode that
 * BuiltByBit and SpigotMC use. Both directions cover the formatting plugin pages actually use;
 * anything without an equivalent (tables, colours, fonts) is passed through as plain text.
 */

const HEADING_SIZES = [7, 6, 5, 4, 4, 4]

/** Swaps matches for placeholders so later passes cannot touch them, and puts them back afterwards. */
function createStash() {
  const items: string[] = []
  return {
    put(value: string) {
      items.push(value)
      return `\u0000${items.length - 1}\u0000`
    },
    restore(text: string) {
      let result = text
      // Stashed values can contain placeholders themselves, so unwind until none are left.
      while (/\u0000\d+\u0000/.test(result)) {
        result = result.replace(/\u0000(\d+)\u0000/g, (_, index) => items[Number(index)])
      }
      return result
    },
  }
}

function inlineToBbcode(text: string, stash: ReturnType<typeof createStash>) {
  return text
    .replace(/`([^`\n]+)`/g, (_, code) => stash.put(`[icode]${code}[/icode]`))
    .replace(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_, url) => stash.put(`[img]${url}[/img]`))
    .replace(/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_, label, url) => `${stash.put(`[url=${url}]`)}${label}[/url]`)
    .replace(/<(https?:\/\/[^>\s]+)>/g, (_, url) => stash.put(`[url]${url}[/url]`))
    .replace(/\*\*\*(.+?)\*\*\*/g, "[b][i]$1[/i][/b]")
    .replace(/\*\*(.+?)\*\*/g, "[b]$1[/b]")
    .replace(/__(.+?)__/g, "[b]$1[/b]")
    .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1[i]$2[/i]")
    .replace(/(^|[^\w])_(?!\s)([^_\n]+?)_(?!\w)/g, "$1[i]$2[/i]")
    .replace(/~~(.+?)~~/g, "[s]$1[/s]")
    .replace(/<\/?center>/gi, (tag) => (tag[1] === "/" ? "[/center]" : "[center]"))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(u|b|i|s)>/gi, (tag, name) => (tag[1] === "/" ? `[/${name.toLowerCase()}]` : `[${name.toLowerCase()}]`))
}

export function markdownToBbcode(markdown: string): string {
  const stash = createStash()
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n")
  const output: string[] = []
  // Open lists, innermost last, with the indent each one started at.
  const lists: Array<{ indent: number; ordered: boolean }> = []
  let quote: string[] | null = null
  // Blank lines inside a list are held back so they land after it rather than inside it.
  let heldBlanks = 0

  const closeLists = (toIndent = -1) => {
    while (lists.length && lists[lists.length - 1].indent > toIndent) {
      lists.pop()
      output.push("[/list]")
    }
    if (!lists.length) {
      for (; heldBlanks > 0; heldBlanks--) output.push("")
    }
  }
  const closeQuote = () => {
    if (!quote) return
    output.push(`[quote]${markdownToBbcode(quote.join("\n"))}[/quote]`)
    quote = null
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]

    const fence = line.match(/^\s*(```|~~~)/)
    if (fence) {
      closeQuote()
      closeLists()
      const body: string[] = []
      while (++index < lines.length && !lines[index].trimStart().startsWith(fence[1])) body.push(lines[index])
      output.push(stash.put(`[code]${body.join("\n")}[/code]`))
      continue
    }

    const quoted = line.match(/^\s*>\s?(.*)$/)
    if (quoted) {
      closeLists()
      ;(quote ??= []).push(quoted[1])
      continue
    }
    closeQuote()

    const item = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/)
    if (item) {
      const indent = item[1].replace(/\t/g, "    ").length
      const ordered = /\d/.test(item[2])
      closeLists(indent)
      // A bulleted list directly followed by a numbered one (or the reverse) is two lists.
      if (lists.length && lists[lists.length - 1].indent === indent && lists[lists.length - 1].ordered !== ordered) {
        closeLists(indent - 1)
      }
      if (!lists.length || lists[lists.length - 1].indent < indent) {
        lists.push({ indent, ordered })
        output.push(ordered ? "[list=1]" : "[list]")
      }
      if (lists.length) heldBlanks = 0
      output.push(`[*]${inlineToBbcode(item[3], stash)}`)
      continue
    }

    // A blank line or an indented continuation keeps the list open; anything else ends it.
    if (lists.length && !line.trim()) {
      heldBlanks += 1
      continue
    }
    if (lists.length && !/^\s{2,}/.test(line)) closeLists()

    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*$/)
    if (heading) {
      output.push(`[size=${HEADING_SIZES[heading[1].length - 1]}][b]${inlineToBbcode(heading[2], stash)}[/b][/size]`)
      continue
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      output.push("[hr][/hr]")
      continue
    }

    output.push(inlineToBbcode(line, stash))
  }
  closeQuote()
  closeLists()

  return stash.restore(output.join("\n")).trim()
}

function quoteLines(text: string) {
  return text
    .trim()
    .split("\n")
    .map((line) => `> ${line}`.trimEnd())
    .join("\n")
}

function listToMarkdown(body: string, ordered: boolean, depth: number) {
  const indent = "  ".repeat(depth)
  return body
    .split(/\[\*\]/)
    .slice(1)
    .map((item, index) => {
      const [first, ...rest] = item.trim().split("\n")
      const marker = ordered ? `${index + 1}.` : "-"
      const continuation = rest.filter((line) => line.trim()).map((line) => `${indent}  ${line.trimEnd()}`)
      return [`${indent}${marker} ${first}`, ...continuation].join("\n")
    })
    .join("\n")
}

export function bbcodeToMarkdown(bbcode: string): string {
  const stash = createStash()
  let text = bbcode.replace(/\r\n?/g, "\n")

  // Code first, so nothing inside it is treated as markup.
  text = text
    .replace(/\[(code|php|html)(?:=[^\]]*)?\]\n?([\s\S]*?)\n?\[\/\1\]/gi, (_, __, code) => stash.put(`\n\`\`\`\n${code}\n\`\`\`\n`))
    .replace(/\[icode\]([\s\S]*?)\[\/icode\]/gi, (_, code) => stash.put(`\`${code}\``))
    .replace(/\[plain\]([\s\S]*?)\[\/plain\]/gi, (_, plain) => stash.put(plain))

  text = text
    .replace(/\[img(?:=[^\]]*)?\]\s*([\s\S]*?)\s*\[\/img\]/gi, (_, url) => stash.put(`![](${url})`))
    .replace(/\[url=(['"]?)([^\]]*?)\1\]([\s\S]*?)\[\/url\]/gi, (_, __, url, label) => `[${label.trim()}]${stash.put(`(${url})`)}`)
    .replace(/\[url\]\s*([\s\S]*?)\s*\[\/url\]/gi, (_, url) => stash.put(`<${url}>`))
    .replace(/\[email(?:=[^\]]*)?\]([\s\S]*?)\[\/email\]/gi, "$1")
    .replace(/\[media=youtube\]\s*([\w-]+)\s*\[\/media\]/gi, (_, id) => stash.put(`<https://www.youtube.com/watch?v=${id}>`))
    .replace(/\[media(?:=[^\]]*)?\]([\s\S]*?)\[\/media\]/gi, "$1")
    .replace(/\[attach[^\]]*\][\s\S]*?\[\/attach\]/gi, "")

  // Large text on a line of its own is a heading; any other size change has no Markdown equivalent.
  text = text.replace(/^[ \t]*((?:\[(?:b|center|color=[^\]]*|font=[^\]]*)\])*)\[size=(\d+)\]([^\n]*?)\[\/size\]((?:\[\/(?:b|center|color|font)\])*)[ \t]*$/gim, (line, _open, size, inner) => {
    const level = Number(size) >= 7 ? 1 : Number(size) === 6 ? 2 : Number(size) === 5 ? 3 : 0
    if (!level) return line
    return `${"#".repeat(level)} ${inner.replace(/\[\/?(?:b|i|u)\]/gi, "").trim()}`
  })

  text = text
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, (_, inner) => (inner.trim() ? `**${inner.trim()}**` : ""))
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, (_, inner) => (inner.trim() ? `*${inner.trim()}*` : ""))
    .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, (_, inner) => (inner.trim() ? `~~${inner.trim()}~~` : ""))

  // Innermost lists first, so nesting resolves from the inside out.
  const listPattern = /\[list(=[^\]]*)?\]((?:(?!\[list)[\s\S])*?)\[\/list\]/i
  for (let depth = 0; listPattern.test(text) && depth < 20; depth++) {
    text = text.replace(listPattern, (_, ordered, body) => `\n${stash.put(listToMarkdown(stash.restore(body), Boolean(ordered), 0))}\n`)
  }

  const quotePattern = /\[quote(?:=[^\]]*)?\]((?:(?!\[quote)[\s\S])*?)\[\/quote\]/i
  for (let depth = 0; quotePattern.test(text) && depth < 20; depth++) {
    text = text.replace(quotePattern, (_, body) => `\n${quoteLines(body)}\n`)
  }

  text = text
    .replace(/\[spoiler(?:=(['"]?)([^\]]*?)\1)?\]([\s\S]*?)\[\/spoiler\]/gi, (_, __, title, body) => `\n<details><summary>${title || "Spoiler"}</summary>\n\n${body.trim()}\n\n</details>\n`)
    .replace(/\[hr\](?:\[\/hr\])?/gi, "\n---\n")
    // Whatever is left (colour, font, alignment, underline) is presentation Markdown cannot carry.
    .replace(/\[\/?(?:u|color|font|size|center|left|right|justify|indent|heading|table|tr|td|th|user|float)(?:=[^\]]*)?\]/gi, "")

  return stash
    .restore(text)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
