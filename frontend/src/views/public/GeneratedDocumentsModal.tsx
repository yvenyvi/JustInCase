import React from 'react';
import { FileText, Search, X } from 'lucide-react';
import Button from '../../components/Button';
import styles from './GeneratedDocumentsModal.module.css';

type GeneratedDocumentItem = {
  id: string;
  templateSlug: string;
  templateTitle: string;
  generatedAt: string;
  status: string;
  content: string;
  fileName: string;
  preview: string;
};

type GeneratedDocumentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  documents: GeneratedDocumentItem[];
  onDownload: (document: GeneratedDocumentItem) => void;
};

const getTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays <= 0) return 'today';
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 30) return `${diffInDays} days ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return '1 month ago';
  return `${diffInMonths} months ago`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
};

const isWithinPeriod = (dateStr: string, period: string) => {
  if (period === 'all') return true;

  const date = new Date(dateStr);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (period === '7d') return diffInDays <= 7;
  if (period === '30d') return diffInDays <= 30;
  if (period === '90d') return diffInDays <= 90;

  return true;
};

const GeneratedDocumentsModal: React.FC<GeneratedDocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  onDownload,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [templateFilter, setTemplateFilter] = React.useState('all');
  const [periodFilter, setPeriodFilter] = React.useState('all');

  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setTemplateFilter('all');
    setPeriodFilter('all');
  }, [isOpen]);

  const templateOptions = React.useMemo(() => {
    const templates = documents.map((doc) => ({
      slug: doc.templateSlug,
      title: doc.templateTitle,
    }));

    const uniqueBySlug = new Map<string, string>();
    templates.forEach((item) => {
      if (!uniqueBySlug.has(item.slug)) {
        uniqueBySlug.set(item.slug, item.title);
      }
    });

    return Array.from(uniqueBySlug.entries())
      .map(([slug, title]) => ({ slug, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [documents]);

  const filteredDocuments = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return documents.filter((doc) => {
      const matchesSearch = !query ||
        doc.templateTitle.toLowerCase().includes(query) ||
        doc.preview.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query);

      const matchesTemplate = templateFilter === 'all' || doc.templateSlug === templateFilter;
      const matchesPeriod = isWithinPeriod(doc.generatedAt, periodFilter);

      return matchesSearch && matchesTemplate && matchesPeriod;
    });
  }, [documents, periodFilter, searchTerm, templateFilter]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.headerTitle}>All Generated Documents</h3>
            <p className={styles.headerSub}>{documents.length} total document(s)</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close documents modal">
            <X size={20} />
          </button>
        </div>

        <div className={styles.controls}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              className={styles.searchInput}
              style={{ paddingLeft: '2rem' }}
              type="text"
              placeholder="Search title or content..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <select
            className={styles.selectInput}
            value={templateFilter}
            onChange={(event) => setTemplateFilter(event.target.value)}
          >
            <option value="all">All Templates</option>
            {templateOptions.map((item) => (
              <option key={item.slug} value={item.slug}>{item.title}</option>
            ))}
          </select>

          <select
            className={styles.selectInput}
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        <div className={styles.list}>
          {filteredDocuments.length === 0 ? (
            <div className={styles.emptyState}>No matching generated documents found.</div>
          ) : (
            filteredDocuments.map((doc) => (
              <div key={doc.id} className={styles.item}>
                <FileText size={18} className={styles.itemIcon} />

                <div className={styles.itemBody}>
                  <div className={styles.itemTop}>
                    <p className={styles.itemTitle}>{doc.templateTitle}</p>
                    <p className={styles.itemDate}>Generated {getTimeAgo(doc.generatedAt)} ({formatDate(doc.generatedAt)})</p>
                  </div>

                  <p className={styles.itemPreview}>{doc.preview}</p>

                  <div className={styles.itemMeta}>
                    <span className={styles.statusBadge}>{doc.status}</span>
                    <span className={styles.templateTag}>{doc.templateSlug}</span>
                  </div>
                </div>

                <div className={styles.itemActions}>
                  <Button variant="outline" size="sm" onClick={() => onDownload(doc)}>
                    Download
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedDocumentsModal;
