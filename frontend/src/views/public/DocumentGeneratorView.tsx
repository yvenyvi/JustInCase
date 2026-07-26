import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Download, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  documentGeneratorService,
  DocumentTemplate,
  DocumentFieldSpec,
  GeneratedDocumentDraft,
} from '../../services/documentGeneratorService';
import styles from './DocumentGeneratorView.module.css';

const DocumentGeneratorView = () => {
  const { user } = useAuth();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<DocumentTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDocumentDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const data = await documentGeneratorService.getTemplates();
        setTemplates(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load document templates.';
        setError(message);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  const allFields = useMemo(() => {
    if (!activeTemplate) return [] as DocumentFieldSpec[];
    return [...activeTemplate.required_fields, ...activeTemplate.optional_fields];
  }, [activeTemplate]);

  const startTemplate = (template: DocumentTemplate) => {
    setError(null);
    setGeneratedDraft(null);
    setActiveTemplate(template);

    const initialValues: Record<string, string> = {};
    [...template.required_fields, ...template.optional_fields].forEach((field) => {
      initialValues[field.key] = '';
    });
    setFormValues(initialValues);
  };

  const resetToLibrary = () => {
    setGeneratedDraft(null);
    setActiveTemplate(null);
    setFormValues({});
    setError(null);
  };

  const updateFieldValue = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeTemplate) return;

    setError(null);
    setIsGenerating(true);

    try {
      const draft = await documentGeneratorService.generateDraft({
        templateId: activeTemplate.id || undefined,
        templateSlug: activeTemplate.slug,
        values: formValues,
      });
      setGeneratedDraft(draft);

      if (user?.id) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Document Ready',
          body: `Your "${activeTemplate.title}" draft has been generated and is ready to download.`,
          link: '/public/documents',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate document.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderInput = (field: DocumentFieldSpec) => {
    const commonProps = {
      required: field.required,
      value: formValues[field.key] || '',
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => updateFieldValue(field.key, e.target.value),
      placeholder: field.placeholder || `Ilagay ang ${field.label.toLowerCase()}...`,
    };

    if (field.type === 'textarea') {
      return <textarea rows={4} className={styles.textArea} {...commonProps} />;
    }

    if (field.type === 'date') {
      return <input type="date" className={styles.dateInput} {...commonProps} />;
    }

    return <input type="text" className={styles.textInput} {...commonProps} />;
  };

  if (activeTemplate && generatedDraft) {
    return (
      <div className={styles.resultContainer}>
        <div className={styles.resultIcon}>
          <CheckCircle size={72} />
        </div>
        <h2 className={`${styles.title} ${styles.resultTitle}`}>Draft Generated Successfully</h2>
        <p className={`${styles.subtitle} ${styles.resultSubtitle}`}>
          Review your generated draft before printing or sending.
        </p>

        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <div className={styles.resultMeta}>
              <FileText size={28} color="var(--color-primary)" />
              <div>
                <h4 className={styles.resultTitleText}>{generatedDraft.templateTitle}</h4>
                <p className={styles.resultSubtext}>
                  Source: {generatedDraft.source === 'database' ? 'Database template' : 'Fallback template'}
                </p>
                <p className={styles.resultSubtext}>
                  Draft mode: {generatedDraft.aiAssisted ? 'AI-enhanced professional draft' : 'Structured template draft'}
                </p>
              </div>
            </div>
            <button
              className={`${styles.primaryBtn} ${styles.downloadBtn}`}
              onClick={() => void documentGeneratorService.downloadDraft(generatedDraft.fileName, generatedDraft.content)}
            >
              <Download size={18} /> Download Draft
            </button>
          </div>

          {generatedDraft.warnings.length > 0 && (
            <div className={styles.warningBox}>
              <p className={styles.warningTitle}>Review Notes</p>
              <ul className={styles.warningList}>
                {generatedDraft.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <pre className={styles.preview}>
            {generatedDraft.content}
          </pre>
        </div>

        <div className={styles.resultFooter}>
          <button className={styles.linkBtn} onClick={resetToLibrary}>Create another document</button>
        </div>
      </div>
    );
  }

  if (activeTemplate) {
    return (
      <div className={styles.container}>
        <div className={styles.editorContainer}>
          <div className={styles.backRow}>
            <button className={styles.backBtn} onClick={resetToLibrary}>← Back to Library</button>
          </div>

          <div className={styles.formCard}>
            <div className={styles.categoryTag}>{activeTemplate.category}</div>
            <h2 className={styles.title}>{activeTemplate.title}</h2>
            <p className={styles.subtitle}>{activeTemplate.description}</p>
            <p className={styles.lawBasis}>
              Legal basis: {activeTemplate.law_basis}
            </p>

            {error && (
              <div className={styles.errorBox}>
                {error}
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              {allFields.map((field) => (
                <div key={field.key} className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    {field.label}{field.required ? ' *' : ''}
                  </label>
                  {renderInput(field)}
                </div>
              ))}

              <div className={styles.actionRow}>
                <button type="button" className={styles.linkBtn} onClick={resetToLibrary}>Cancel</button>
                <button type="submit" className={`${styles.primaryBtn} ${styles.downloadBtn}`} disabled={isGenerating}>
                  {isGenerating ? (
                    <span className={styles.downloadBtn}>
                      <Loader2 className="animate-spin" size={16} /> Generating...
                    </span>
                  ) : (
                    'Generate Legal Draft'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>SELF-ADVOCACY</div>
          <h1 className={styles.title}>Document Generator</h1>
          <p className={styles.subtitle}>
            Generate professional legal drafts using expanded Philippine-law templates with AI-enhanced formatting when available.
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <div>
        <h2 className={styles.sectionTitle}>Available Templates</h2>

        {isLoadingTemplates ? (
          <div className={styles.loadingRow}>
            <Loader2 className="animate-spin" size={18} /> Loading templates...
          </div>
        ) : (
          <div className={styles.libraryGrid}>
            {templates.map((template) => (
              <div key={template.slug} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.categoryTag}>{template.category}</span>
                  <span className={styles.minutes}>
                    ⏱️ ~{template.estimated_minutes} mins
                  </span>
                </div>

                <h3 className={styles.templateTitle}>{template.title}</h3>
                <p className={styles.templateDescription}>{template.description}</p>

                <button
                  className={styles.primaryBtn}
                  onClick={() => startTemplate(template)}
                >
                  Start <span><ArrowRight size={18} /></span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGeneratorView;
