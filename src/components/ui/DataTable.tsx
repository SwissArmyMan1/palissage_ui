import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * Attribute-by-attribute comparison down a column. Under ~5 rows a dense list
 * reads better and the caller should render one instead (doc 03).
 *
 * Responsive strategy is option (b) everywhere, no exceptions: below `md` each
 * row becomes a stacked card of label/value pairs. Horizontal scroll loses the
 * money column and a reduced column set hides the deadline.
 *
 * Sorting never animates the rows.
 */
export interface Column<Row> {
  id: string;
  header: string;
  /** Right-align numeric columns; they are tabular by default. */
  numeric?: boolean;
  cell: (row: Row) => React.ReactNode;
  /** Hidden on the stacked mobile card when the value is already in the title. */
  hideOnStack?: boolean;
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowTitle,
  rowHref,
  density = 'comfortable',
  caption,
  className,
}: {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** The identity cell, used as the heading of the stacked mobile card. */
  rowTitle: (row: Row) => React.ReactNode;
  rowHref?: (row: Row) => string;
  density?: 'compact' | 'comfortable';
  caption: string;
  className?: string;
}) {
  const rowHeight = density === 'compact' ? 'h-9' : 'h-12';

  return (
    <>
      {/* Desktop and tablet: a real table. */}
      <div className={cn('hidden md:block', className)}>
        <table className="w-full text-body-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-surface-sunken">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    'px-4 py-3 t-caption font-medium text-ink-secondary',
                    column.numeric ? 'text-right' : 'text-left',
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {rows.map((row) => (
              <tr key={rowKey(row)} className={cn('row-hover bg-surface', rowHeight)}>
                {columns.map((column, index) => (
                  <td
                    key={column.id}
                    className={cn(
                      'px-4 align-middle',
                      column.numeric && 'text-right tabular-nums',
                      index === 0 && 'font-medium',
                    )}
                  >
                    {index === 0 && rowHref ? (
                      <Link
                        to={rowHref(row)}
                        className="underline decoration-transparent underline-offset-4 transition-colors duration-fast ease-out hover:decoration-current"
                      >
                        {column.cell(row)}
                      </Link>
                    ) : (
                      column.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: row becomes a stacked card. */}
      <ul className={cn('space-y-3 md:hidden', className)}>
        {rows.map((row) => {
          const href = rowHref?.(row);
          const body = (
            <div className="card space-y-3 p-4">
              <p className="t-h3">{rowTitle(row)}</p>
              <dl className="space-y-2">
                {columns.slice(1).map((column) =>
                  column.hideOnStack ? null : (
                    <div key={column.id} className="flex items-baseline justify-between gap-4">
                      <dt className="t-caption text-ink-secondary">{column.header}</dt>
                      <dd className={cn('text-body-sm', column.numeric && 'tabular-nums')}>
                        {column.cell(row)}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          );
          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link to={href} className="block">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Homogeneous items with metadata, where the question is not "compare columns". */
export function DenseList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ul className={cn('divide-y divide-edge-subtle', className)}>{children}</ul>;
}

export function DenseRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn('flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap', className)}>
      {children}
    </li>
  );
}
