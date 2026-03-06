'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ArtworkGuidelines from '@/components/orders/ArtworkGuidelines';
import type { ArtworkFile } from '@/types';

const ACCEPTED = '.png,.jpg,.jpeg,.pdf,.ai,.eps,.svg';
const MAX_MB = 50;

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function ArtworkUploader({
  orderId,
  userId,
  isStudio,
}: {
  orderId: string;
  userId: string;
  isStudio: boolean;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<ArtworkFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    supabase
      .from('artwork_files')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setFiles((data as ArtworkFile[]) ?? []));
  }, [orderId]);

  async function handleFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    setError(null);
    setUploading(true);

    for (const file of Array.from(selected)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`${file.name} exceeds the ${MAX_MB}MB limit.`);
        continue;
      }

      const ext = file.name.split('.').pop();
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storagePath = `${userId}/${orderId}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('artwork')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: record, error: dbError } = await supabase
        .from('artwork_files')
        .insert({
          order_id: orderId,
          user_id: userId,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (dbError) {
        setError(`Uploaded but failed to save record: ${dbError.message}`);
      } else {
        setFiles(prev => [record as ArtworkFile, ...prev]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDownload(file: ArtworkFile) {
    const { data, error } = await supabase.storage
      .from('artwork')
      .createSignedUrl(file.file_path, 60);

    if (error || !data) return;
    window.open(data.signedUrl, '_blank');
  }

  async function handleDelete(file: ArtworkFile) {
    if (!confirm(`Delete "${file.file_name}"?`)) return;

    await supabase.storage.from('artwork').remove([file.file_path]);
    await supabase.from('artwork_files').delete().eq('id', file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
  }

  return (
    <div style={{ marginTop: 20 }}>
      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '2px',
          textTransform: 'uppercase', color: 'var(--brown-light)',
          fontFamily: 'Lato, sans-serif',
        }}>
          Artwork Files
        </span>
        {!isStudio && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              fontSize: 12, fontWeight: 700, fontFamily: 'Lato, sans-serif',
              color: uploading ? 'var(--brown-light)' : 'var(--terracotta)',
              background: 'none', border: 'none', cursor: uploading ? 'default' : 'pointer',
              padding: 0, letterSpacing: '0.5px',
            }}
          >
            {uploading ? 'Uploading…' : '+ Upload Files'}
          </button>
        )}
      </div>

      {/* Artwork guidelines — only for customers */}
      {!isStudio && <ArtworkGuidelines />}

      {/* Drop zone — only for customers */}
      {!isStudio && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--terracotta)' : 'var(--cream-dark)'}`,
            borderRadius: 10,
            padding: '18px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--terracotta-pale)' : 'transparent',
            transition: 'all 0.2s ease',
            marginBottom: files.length > 0 ? 12 : 0,
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>🎨</div>
          <p style={{
            margin: 0, fontSize: 13, color: 'var(--brown-light)',
            fontFamily: 'Lato, sans-serif',
          }}>
            Drop files here or <span style={{ color: 'var(--terracotta)', fontWeight: 700 }}>browse</span>
          </p>
          <p style={{
            margin: '4px 0 0', fontSize: 11, color: 'var(--brown-light)',
            fontFamily: 'Lato, sans-serif',
          }}>
            PNG, JPG, PDF, AI, EPS, SVG · Max {MAX_MB}MB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Error message */}
      {error && (
        <div style={{
          fontSize: 12, color: '#c0392b', fontFamily: 'Lato, sans-serif',
          background: '#fdf2f2', border: '1px solid #f5c6c6',
          borderRadius: 8, padding: '8px 12px', marginBottom: 10,
        }}>
          {error}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map(file => (
            <div key={file.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--cream)', borderRadius: 8,
              border: '1px solid var(--cream-dark)',
              padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: 16 }}>{getFileIcon(file.mime_type, file.file_name)}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 600,
                    color: 'var(--brown)', fontFamily: 'Lato, sans-serif',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 220,
                  }}>
                    {file.file_name}
                  </p>
                  <p style={{
                    margin: 0, fontSize: 11, color: 'var(--brown-light)',
                    fontFamily: 'Lato, sans-serif',
                  }}>
                    {formatBytes(file.file_size)} · {formatDate(file.created_at)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleDownload(file)}
                  style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '1px',
                    textTransform: 'uppercase', fontFamily: 'Lato, sans-serif',
                    color: 'var(--brown-light)', background: 'none',
                    border: '1px solid var(--cream-dark)', borderRadius: 6,
                    padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  View
                </button>
                {(isStudio || file.user_id === userId) && (
                  <button
                    onClick={() => handleDelete(file)}
                    style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '1px',
                      textTransform: 'uppercase', fontFamily: 'Lato, sans-serif',
                      color: '#c0392b', background: 'none',
                      border: '1px solid #f5c6c6', borderRadius: 6,
                      padding: '4px 10px', cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && isStudio && (
        <p style={{
          fontSize: 13, color: 'var(--brown-light)', fontFamily: 'Lato, sans-serif',
          fontStyle: 'italic', margin: 0,
        }}>
          No artwork uploaded yet.
        </p>
      )}
    </div>
  );
}

function getFileIcon(mimeType: string | null, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (ext === 'ai' || ext === 'eps') return '🖊️';
  if (ext === 'svg') return '✏️';
  if (mimeType?.startsWith('image/')) return '🖼️';
  return '📎';
}
