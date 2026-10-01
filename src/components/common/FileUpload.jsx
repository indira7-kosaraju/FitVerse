import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import Button from './Button';
import styles from '../../styles/FileUpload.module.css';

/**
 * Drag & drop / click file picker with previews and size validation.
 * onFiles(files: File[]) fires after validation. If `onUpload` is passed, an
 * "Upload" button appears and calls onUpload(files) (should return a Promise).
 */
export default function FileUpload({
  label = 'Upload files',
  accept = 'image/*',
  multiple = false,
  maxSizeMB = 5,
  maxFiles = 6,
  onFiles,
  onUpload,
  uploading = false,
  progress,
  hint,
  error: externalError,
  compact = false,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  const acceptsType = (file) => {
    if (!accept || accept === '*') return true;
    return accept.split(',').some((rule) => {
      const r = rule.trim();
      if (r.endsWith('/*')) return file.type.startsWith(r.slice(0, -1));
      if (r.startsWith('.')) return file.name.toLowerCase().endsWith(r.toLowerCase());
      return file.type === r;
    });
  };

  const handleFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    const bad = incoming.find((f) => !acceptsType(f));
    if (bad) return setError(`"${bad.name}" is not a supported file type.`);
    const big = incoming.find((f) => f.size > maxSizeMB * 1024 * 1024);
    if (big) return setError(`"${big.name}" is larger than ${maxSizeMB} MB.`);
    const next = multiple ? [...files, ...incoming].slice(0, maxFiles) : incoming.slice(0, 1);
    if (multiple && files.length + incoming.length > maxFiles) setError(`You can upload up to ${maxFiles} files at once.`);
    else setError('');
    setFiles(next);
    onFiles?.(next);
  };

  const removeAt = (idx) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    onFiles?.(next);
  };

  const handleUpload = async () => {
    try {
      await onUpload?.(files);
      setFiles([]);
      onFiles?.([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      // caller shows toast; keep files so user can retry
    }
  };

  const shownError = externalError || error;

  return (
    <div className={styles.wrap}>
      <label
        htmlFor={inputId}
        className={`${styles.drop} ${dragOver ? styles.dragOver : ''} ${compact ? styles.compact : ''} ${shownError ? styles.invalid : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span className={styles.iconWrap}>
          <Icon name="upload" size={22} />
        </span>
        <span className={styles.text}>
          <strong>{label}</strong>
          <span>Drag & drop or click to browse · max {maxSizeMB} MB</span>
          {hint && <span>{hint}</span>}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          aria-describedby={shownError ? `${inputId}-err` : undefined}
        />
      </label>

      {shownError && (
        <p id={`${inputId}-err`} className={styles.error} role="alert">
          {shownError}
        </p>
      )}

      {files.length > 0 && (
        <ul className={styles.previews}>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className={styles.preview}>
              {previews[i] ? <img src={previews[i]} alt={`Preview of ${f.name}`} /> : <Icon name="file" size={28} />}
              <span className={styles.fileName}>{f.name}</span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeAt(i)}
                aria-label={`Remove ${f.name}`}
                disabled={uploading}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {uploading && typeof progress === 'number' && (
        <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}

      {onUpload && files.length > 0 && (
        <Button icon="upload" onClick={handleUpload} loading={uploading} size="sm">
          Upload {files.length} file{files.length > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}
