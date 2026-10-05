import { Link } from 'react-router-dom';

export function AppFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-extrabold text-brand-600">zomato</span> clone — a React + Firebase demo project.
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p>Built with Vite, TypeScript, Tailwind CSS, Firestore and Cloud Storage.</p>
          {/* Staff entry point. The login screen and Firestore rules both gate it,
              so linking it here exposes nothing. */}
          <Link
            to="/admin"
            className="font-semibold text-neutral-400 underline-offset-4 transition hover:text-brand-600 hover:underline"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
