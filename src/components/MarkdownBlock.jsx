import { Link } from 'react-router-dom';
import './MarkdownBlock.css';

const INLINE_TOKEN_PATTERN =
  /(<br\s*\/?\s*>|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s<>()]+|\[\d+\]|\*\*[^*\n]+?\*\*|__[^_\n]+?__|(?<![\p{L}\p{N}\\])\*[^*\n]+?\*(?![\p{L}\p{N}])|(?<![\p{L}\p{N}\\])_[^_\n]+?_(?![\p{L}\p{N}]))/gu;

function renderInline(text, citationTarget = '') {
  if (!text) return '';

  return String(text)
    .split(INLINE_TOKEN_PATTERN)
    .map((part, index) => {
      if (/^<br\s*\/?\s*>$/i.test(part)) {
        return <br key={index} />;
      }
      const citation = citationTarget ? part.match(/^`?\[(\d+)\]`?$/) : null;
      if (citation) {
        const number = citation[1];
        return (
          <sup className="markdown-citation" key={index}>
            <a href={`${citationTarget}-${number}`}>[{number}]</a>
          </sup>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('__') && part.endsWith('__')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (
        (part.startsWith('*') && part.endsWith('*')) ||
        (part.startsWith('_') && part.endsWith('_'))
      ) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('[') && part.endsWith(')')) {
        const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          const [, label, url] = match;
          if (url.startsWith('/')) {
            return (
              <Link key={index} to={url}>
                {label}
              </Link>
            );
          }
          if (url.startsWith('#')) {
            return (
              <a key={index} href={url}>
                {label}
              </a>
            );
          }
          return (
            <a key={index} href={url} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          );
        }
      }
      if (/^https?:\/\//i.test(part)) {
        const href = part.replace(/[.,;:]+$/g, '');
        const trailing = part.slice(href.length);
        return (
          <span key={index}>
            <a href={href} target="_blank" rel="noopener noreferrer">
              {href}
            </a>
            {trailing}
          </span>
        );
      }
      return part.replace(/\\\*/g, '*');
    });
}

export function MarkdownBlock({
  block,
  tableClassName = 'markdown-table-wrap',
  tocClassName = 'markdown-toc',
  citationTarget = '',
  referenceList = false,
  referenceLinks = {},
}) {
  if (block.type === 'hr') return <hr />;
  if (block.type === 'blockquote') {
    return <blockquote>{renderInline(block.text, citationTarget)}</blockquote>;
  }
  if (block.type === 'heading') {
    const Tag = `h${Math.min(block.level + 1, 4)}`;
    return <Tag>{renderInline(block.text, citationTarget)}</Tag>;
  }
  if (block.type === 'list' || block.type === 'ordered-list') {
    const Tag = block.type === 'ordered-list' ? 'ol' : 'ul';
    return (
      <Tag>
        {block.items.map((item, index) => {
          const referenceNumber = referenceList
            ? item.match(/^\s*`?\[(\d+)\]`?\s*/)?.[1]
            : null;
          const referenceId = referenceNumber
            ? `${citationTarget.replace(/^#/, '')}-${referenceNumber}`
            : undefined;
          const referenceLink = referenceNumber
            ? referenceLinks[referenceNumber]
            : null;
          return (
            <li key={index} id={referenceId}>
              {renderInline(item, referenceList ? '' : citationTarget)}
              {referenceLink && (
                <a
                  className="markdown-reference-link"
                  href={referenceLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {referenceLink.label || 'เปิดลิงก์อ้างอิง'}
                </a>
              )}
            </li>
          );
        })}
      </Tag>
    );
  }
  if (block.type === 'toc') {
    return (
      <div className={`${tocClassName} markdown-toc`} aria-label="สารบัญ">
        {block.items.map((item, index) => (
          <div className="markdown-toc-item" key={`${item.label}-${index}`}>
            <span className="markdown-toc-label">
              {renderInline(item.label, citationTarget)}
            </span>
            {item.page && (
              <span className="markdown-toc-page">{item.page}</span>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === 'table') {
    const [head = [], ...body] = block.rows;
    return (
      <div className={tableClassName}>
        <table>
          <thead>
            <tr>
              {head.map((cell, index) => (
                <th key={index}>{renderInline(cell, citationTarget)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{renderInline(cell, citationTarget)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === 'code') {
    return (
      <pre>
        <code>{block.text}</code>
      </pre>
    );
  }
  return <p>{renderInline(block.text, citationTarget)}</p>;
}
