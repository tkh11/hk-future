import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { productMarkdown } from '@/content/product-markdown';
import styles from './Products.module.css';

export default function ProductText({ text, specifications = false }: { text: string; specifications?: boolean }) {
  return <div className={styles.description}>
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
      h1: ({ children }) => <h2>{children}</h2>,
      table: ({ children }) => <div className={styles.markdownTable} tabIndex={0}><table>{children}</table></div>,
    }}>{productMarkdown(text, specifications)}</Markdown>
  </div>;
}
