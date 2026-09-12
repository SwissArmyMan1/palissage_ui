import { useLocale } from '@/lib/i18n/context';
import { LinkButton } from '@/components/ui/Button';

/**
 * SYS-01. A specific 404 that names what was not found, and never silently
 * substitutes a different object.
 */
export function NotFound({ what }: { what?: string }) {
  const { t } = useLocale();
  return (
    <div className="shell py-24">
      <div className="max-w-reading">
        <p className="t-caption text-accent">{t('Not found')}</p>
        <h1 className="mt-4 t-h1">
          {what ? t('We could not find {what}.', { what }) : t('We could not find that page.')}
        </h1>
        <p className="mt-6 text-body text-ink-secondary">
          {what
            ? t(
                'It may have been removed, or the link may be wrong. Nothing has been substituted for it — the catalogue below is the full published list.',
              )
            : t('The link may be wrong, or the page may have moved.')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton to="/lots">{t('Browse the lots')}</LinkButton>
          <LinkButton to="/" kind="secondary">
            {t('Go to the home page')}
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

export default function NotFoundPage() {
  return <NotFound />;
}
