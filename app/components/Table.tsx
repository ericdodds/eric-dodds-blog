import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * Styled, mobile-friendly table component.
 *
 * Wraps the native <table> in a horizontally-scrollable container so wide
 * tables stay readable on small screens, and applies a scoped class
 * (`.prose-table`) whose cell/header styling lives in app/global.css.
 *
 * Mapped from both `<Table>` (explicit JSX) and markdown `table` elements
 * (via the lowercase `table` key in the MDX components map) so GFM tables
 * and hand-written tables render identically.
 */
function Table({ children, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="prose-table" {...props}>
        {children as ReactNode}
      </table>
    </div>
  )
}

export default Table
