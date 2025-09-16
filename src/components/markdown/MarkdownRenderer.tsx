import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';
import { CaretDown, CaretRight } from '@phosphor-icons/react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Custom components for better styling
const components = {
  // Headers with better styling
  h1: ({ children, ...props }: any) => (
    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4 mt-6 first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-3 mt-5 first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2 mt-4 first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 mb-2 mt-3 first:mt-0" {...props}>
      {children}
    </h4>
  ),

  // Paragraphs with better spacing
  p: ({ children, ...props }: any) => (
    <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3 leading-relaxed" {...props}>
      {children}
    </p>
  ),

  // Lists with better styling
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-4 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-4 space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-sm text-neutral-700 dark:text-neutral-300 ml-2" {...props}>
      {children}
    </li>
  ),

  // Code blocks with syntax highlighting
  code: ({ children, className, ...props }: any) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-xs font-mono text-neutral-900 dark:text-neutral-100" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={`block bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg text-xs font-mono text-neutral-900 dark:text-neutral-100 overflow-x-auto ${className || ''}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: any) => (
    <pre className="bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg mb-4 overflow-x-auto" {...props}>
      {children}
    </pre>
  ),

  // Blockquotes
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-[#F48120] pl-4 py-2 mb-4 bg-neutral-50 dark:bg-neutral-800 rounded-r-lg" {...props}>
      {children}
    </blockquote>
  ),

  // Tables
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-neutral-300 dark:border-neutral-700" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-neutral-100 dark:bg-neutral-800" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr className="border-b border-neutral-300 dark:border-neutral-700" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: any) => (
    <th className="px-3 py-2 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-50" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300" {...props}>
      {children}
    </td>
  ),

  // Links
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href} 
      className="text-[#F48120] hover:text-[#F48120]/80 underline decoration-dotted underline-offset-2" 
      target="_blank" 
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),

  // Strong/Bold text
  strong: ({ children, ...props }: any) => (
    <strong className="font-semibold text-neutral-900 dark:text-neutral-50" {...props}>
      {children}
    </strong>
  ),

  // Emphasis/Italic text
  em: ({ children, ...props }: any) => (
    <em className="italic text-neutral-700 dark:text-neutral-300" {...props}>
      {children}
    </em>
  ),
};

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="mb-4">
      <Button
        variant="ghost"
        className="w-full justify-between p-2 h-auto text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold text-neutral-900 dark:text-neutral-50">{title}</span>
        {isOpen ? (
          <CaretDown className="w-4 h-4" />
        ) : (
          <CaretRight className="w-4 h-4" />
        )}
      </Button>
      {isOpen && (
        <div className="mt-2 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700">
          {children}
        </div>
      )}
    </div>
  );
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Split content into sections based on headers
  const sections = content.split(/(?=### 🔵|### 🟠|### 🔴|### \*\*|### \w+)/);
  
  if (sections.length <= 1) {
    // No sections to collapse, render normally
    return (
      <Card className={`p-4 bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 ${className}`}>
        <ReactMarkdown
          components={components}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </Card>
    );
  }

  // Render with collapsible sections
  return (
    <Card className={`p-4 bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 ${className}`}>
      {sections.map((section, index) => {
        if (index === 0) {
          // First section (intro) - always visible
          return (
            <ReactMarkdown
              key={index}
              components={components}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {section}
            </ReactMarkdown>
          );
        }

        // Extract title from section
        const titleMatch = section.match(/^### (.*?)(?:\n|$)/);
        const title = titleMatch ? titleMatch[1] : `Section ${index}`;
        const sectionContent = section.replace(/^### .*?\n/, '');

        return (
          <CollapsibleSection key={index} title={title} defaultOpen={index <= 2}>
            <ReactMarkdown
              components={components}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {sectionContent}
            </ReactMarkdown>
          </CollapsibleSection>
        );
      })}
    </Card>
  );
}
