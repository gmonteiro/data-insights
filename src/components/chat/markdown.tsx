"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  table: ({ children, ...props }) => (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: "13px",
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      style={{
        border: "1px solid #d1d5db",
        padding: "6px 10px",
        backgroundColor: "#f3f4f6",
        fontWeight: 600,
        textAlign: "left",
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      style={{
        border: "1px solid #d1d5db",
        padding: "6px 10px",
      }}
      {...props}
    >
      {children}
    </td>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <pre
          style={{
            backgroundColor: "#1f2937",
            color: "#e5e7eb",
            padding: "12px",
            borderRadius: "6px",
            overflowX: "auto",
            fontSize: "13px",
          }}
        >
          <code {...props}>{children}</code>
        </pre>
      );
    }
    return (
      <code
        style={{
          backgroundColor: "#f3f4f6",
          padding: "2px 4px",
          borderRadius: "3px",
          fontSize: "13px",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  p: ({ children, ...props }) => (
    <p style={{ margin: "6px 0", lineHeight: 1.6 }} {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul style={{ paddingLeft: "20px", margin: "6px 0" }} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol style={{ paddingLeft: "20px", margin: "6px 0" }} {...props}>
      {children}
    </ol>
  ),
  h1: ({ children, ...props }) => (
    <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "12px 0 6px" }} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 style={{ fontSize: "17px", fontWeight: 600, margin: "10px 0 4px" }} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "8px 0 4px" }} {...props}>
      {children}
    </h3>
  ),
};

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
