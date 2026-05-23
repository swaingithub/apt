import React, { useState } from 'react';
import type { Collection, CollectionField } from '../types';
import { X, Plus, Trash2, Edit2, Check, Database, AlertCircle } from 'lucide-react';

interface CollectionModalProps {
  collection: Collection;
  onUpdateCollection: (updated: Collection) => void;
  onClose: () => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({ collection, onUpdateCollection, onClose }) => {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'boolean'>('text');
  const [newRecordData, setNewRecordData] = useState<Record<string, any>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecordData, setEditingRecordData] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanName = newFieldName.trim();
    if (!cleanName) { setErrorMsg('Field name required'); return; }
    if (collection.fields.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) { setErrorMsg('Name already exists'); return; }

    const newField: CollectionField = { name: cleanName, type: newFieldType };
    const updatedRecords = collection.records.map(rec => ({
      ...rec, [cleanName]: newFieldType === 'number' ? 0 : newFieldType === 'boolean' ? false : ''
    }));
    onUpdateCollection({ ...collection, fields: [...collection.fields, newField], records: updatedRecords });
    setNewFieldName('');
  };

  const handleDeleteField = (fieldName: string) => {
    const updatedFields = collection.fields.filter(f => f.name !== fieldName);
    const updatedRecords = collection.records.map(rec => { const c = { ...rec }; delete c[fieldName]; return c; });
    onUpdateCollection({ ...collection, fields: updatedFields, records: updatedRecords });
  };

  const handleAddRecord = () => {
    const newId = `rec-${Date.now()}`;
    const record: Record<string, any> = { _id: newId };
    collection.fields.forEach(field => {
      const val = newRecordData[field.name];
      record[field.name] = field.type === 'number' ? Number(val || 0) : field.type === 'boolean' ? Boolean(val) : String(val || '');
    });
    onUpdateCollection({ ...collection, records: [...collection.records, record] });
    setNewRecordData({});
  };

  const handleDeleteRecord = (id: string) => onUpdateCollection({ ...collection, records: collection.records.filter(r => r._id !== id) });

  const startEditRecord = (rec: Record<string, any>) => { setEditingRecordId(rec._id); setEditingRecordData({ ...rec }); };

  const saveEditRecord = () => {
    const updatedRecords = collection.records.map(r => {
      if (r._id === editingRecordId) {
        const compiled = { ...editingRecordData };
        collection.fields.forEach(field => {
          compiled[field.name] = field.type === 'number' ? Number(compiled[field.name] || 0) : field.type === 'boolean' ? (compiled[field.name] === true || compiled[field.name] === 'true') : String(compiled[field.name] || '');
        });
        return compiled;
      }
      return r;
    });
    onUpdateCollection({ ...collection, records: updatedRecords });
    setEditingRecordId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '800px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database style={{ color: 'var(--accent-hover)' }} size={18} />
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{collection.name}</h2>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{collection.fields.length} columns · {collection.records.length} records</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Schema */}
          <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <h3 style={{ fontSize: '0.72rem', marginBottom: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Schema</h3>
            <form onSubmit={handleAddField} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <span className="form-label" style={{ fontSize: '0.6rem' }}>Column</span>
                <input type="text" className="form-input" placeholder="Name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} style={{ padding: '6px 8px', fontSize: '0.72rem' }} />
              </div>
              <div>
                <span className="form-label" style={{ fontSize: '0.6rem' }}>Type</span>
                <select className="form-select" style={{ width: '100px', padding: '6px 8px', fontSize: '0.72rem' }} value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as any)}>
                  <option value="text">Text</option><option value="number">Number</option><option value="boolean">Boolean</option>
                </select>
              </div>
              <button type="submit" className="glow-btn" style={{ padding: '6px 10px', fontSize: '0.7rem' }}><Plus size={14} /> Add</button>
            </form>
            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '0.65rem', marginBottom: '10px' }}>
                <AlertCircle size={12} /><span>{errorMsg}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {collection.fields.length === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>No columns yet</span>}
              {collection.fields.map((field) => (
                <div key={field.name} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 8px', background: 'var(--bg-app)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.68rem'
                }}>
                  <span style={{ fontWeight: 500 }}>{field.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>({field.type})</span>
                  <button onClick={() => handleDeleteField(field.name)} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={11} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Data Grid */}
          <div>
            <h3 style={{ fontSize: '0.72rem', marginBottom: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Records</h3>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {collection.fields.map(field => (
                      <th key={field.name} style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{field.name}</th>
                    ))}
                    <th style={{ padding: '8px 12px', width: '80px', fontWeight: 500, textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.65rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {collection.records.length === 0 ? (
                    <tr><td colSpan={collection.fields.length + 1} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>No records yet. Add one below.</td></tr>
                  ) : (
                    collection.records.map((rec) => {
                      const isEditing = editingRecordId === rec._id;
                      return (
                        <tr key={rec._id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          {collection.fields.map(field => (
                            <td key={field.name} style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                              {isEditing ? (
                                field.type === 'boolean' ? (
                                  <select className="form-select" style={{ padding: '3px 6px', fontSize: '0.7rem' }} value={String(editingRecordData[field.name])} onChange={(e) => setEditingRecordData({ ...editingRecordData, [field.name]: e.target.value === 'true' })}>
                                    <option value="true">True</option><option value="false">False</option>
                                  </select>
                                ) : (
                                  <input type={field.type === 'number' ? 'number' : 'text'} className="form-input" style={{ padding: '3px 6px', fontSize: '0.7rem', width: '100%' }} value={editingRecordData[field.name] ?? ''} onChange={(e) => setEditingRecordData({ ...editingRecordData, [field.name]: e.target.value })} />
                                )
                              ) : (
                                field.type === 'boolean' ? (
                                  <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 500, background: rec[field.name] ? 'var(--success-bg)' : 'var(--danger-bg)', color: rec[field.name] ? 'var(--success)' : 'var(--danger)' }}>
                                    {rec[field.name] ? 'True' : 'False'}
                                  </span>
                                ) : field.type === 'number' ? (
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}>{rec[field.name]}</span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem' }}>{rec[field.name]}</span>
                                )
                              )}
                            </td>
                          ))}
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '3px' }}>
                              {isEditing ? (
                                <>
                                  <button onClick={saveEditRecord} className="icon-btn" style={{ color: 'var(--success)', width: '24px', height: '24px' }}><Check size={12} /></button>
                                  <button onClick={() => setEditingRecordId(null)} className="icon-btn" style={{ width: '24px', height: '24px' }}><X size={12} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditRecord(rec)} className="icon-btn" style={{ width: '24px', height: '24px' }}><Edit2 size={12} /></button>
                                  <button onClick={() => handleDeleteRecord(rec._id)} className="icon-btn" style={{ color: 'var(--text-muted)', width: '24px', height: '24px' }}><Trash2 size={12} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  <tr style={{ background: 'var(--bg-app)' }}>
                    {collection.fields.map(field => (
                      <td key={field.name} style={{ padding: '8px 12px' }}>
                        {field.type === 'boolean' ? (
                          <select className="form-select" style={{ padding: '4px 6px', fontSize: '0.7rem' }} value={String(newRecordData[field.name] ?? 'false')} onChange={(e) => setNewRecordData({ ...newRecordData, [field.name]: e.target.value === 'true' })}>
                            <option value="false">False</option><option value="true">True</option>
                          </select>
                        ) : (
                          <input type={field.type === 'number' ? 'number' : 'text'} className="form-input" placeholder="..." style={{ padding: '4px 6px', fontSize: '0.7rem' }} value={newRecordData[field.name] ?? ''} onChange={(e) => setNewRecordData({ ...newRecordData, [field.name]: e.target.value })} />
                        )}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <button onClick={handleAddRecord} disabled={collection.fields.length === 0} className="glow-btn" style={{ padding: '4px 8px', fontSize: '0.65rem', borderRadius: 'var(--radius-sm)' }}><Plus size={12} /> Add</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose} style={{ padding: '6px 14px', fontSize: '0.72rem' }}>Close</button>
        </div>
      </div>
    </div>
  );
};
