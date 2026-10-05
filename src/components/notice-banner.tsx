import { CloseIcon } from './icons';

interface NoticeBannerProps {
  message: string | null;
  onDismiss: () => void;
}

/** Explains why the UI is showing bundled data instead of Firestore results. */
export function NoticeBanner({ message, onDismiss }: NoticeBannerProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full p-1 text-amber-700 hover:bg-amber-100"
        aria-label="Dismiss notice"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  );
}
