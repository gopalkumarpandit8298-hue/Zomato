import type { ReactNode } from 'react';

interface AdminPageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPage({ title, description, actions, children }: AdminPageProps) {
  return (
    <div className="py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        </div>
        {actions}
      </header>

      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AdminPanel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function AdminTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl text-left text-sm">
        <thead className="bg-neutral-50 text-xs tracking-wide text-neutral-500 uppercase">
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="px-5 py-3 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
    </div>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return <p className="px-5 py-10 text-center text-sm text-neutral-500">{message}</p>;
}

export function AdminError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
      {message}
    </p>
  );
}
