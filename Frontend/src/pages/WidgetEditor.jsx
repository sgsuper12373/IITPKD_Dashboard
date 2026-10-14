import { useState } from 'react';
import { WIDGET_TYPES, DATA_KEYS, dataKeysForType } from '../utils/widgetCatalog';
import './WidgetEditor.css';

function AddWidgetForm({ onAdd }) {
  const [type, setType] = useState('');
  const [dataKey, setDataKey] = useState('');
  const [size, setSize] = useState('md');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const typeDef = WIDGET_TYPES[type];
  const keys = type ? dataKeysForType(type) : [];

  const handleTypeChange = (t) => {
    setType(t);
    setDataKey('');
    setSize(WIDGET_TYPES[t]?.sizes[0] ?? 'md');
    const firstKey = dataKeysForType(t)[0];
    if (firstKey) {
      setDataKey(firstKey.key);
      setTitle(firstKey.label);
    }
  };

  const handleKeyChange = (k) => {
    setDataKey(k);
    const def = DATA_KEYS[k];
    if (def) setTitle(def.label);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type || !dataKey) return;
    setBusy(true);
    try {
      await onAdd({ widget_type: type, data_key: dataKey, size, title });
      setType('');
      setDataKey('');
      setSize('md');
      setTitle('');
    } catch (err) {
      console.error('Add widget failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="we-add" onSubmit={handleSubmit}>
      <h3 className="we-add__title">Add widget</h3>
      <div className="we-add__row">
        <label className="we-add__label">
          Type
          <select value={type} onChange={(e) => handleTypeChange(e.target.value)} className="we-add__select">
            <option value="">Choose…</option>
            {Object.entries(WIDGET_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </label>

        <label className="we-add__label">
          Metric
          <select value={dataKey} onChange={(e) => handleKeyChange(e.target.value)} className="we-add__select" disabled={!type}>
            <option value="">Choose…</option>
            {keys.map((k) => (
              <option key={k.key} value={k.key}>{k.label}</option>
            ))}
          </select>
        </label>

        <label className="we-add__label">
          Size
          <select value={size} onChange={(e) => setSize(e.target.value)} className="we-add__select" disabled={!typeDef}>
            {(typeDef?.sizes ?? ['sm', 'md', 'lg']).map((s) => (
              <option key={s} value={s}>{s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}</option>
            ))}
          </select>
        </label>

        <label className="we-add__label">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="we-add__input"
            placeholder="Widget title"
          />
        </label>
      </div>
      <button type="submit" className="we-add__btn" disabled={busy || !type || !dataKey}>
        {busy ? 'Adding…' : '+ Add widget'}
      </button>
    </form>
  );
}

function WidgetRow({ widget, index, total, onUpdate, onDelete, onMove }) {
  const [busy, setBusy] = useState(false);
  const typeDef = WIDGET_TYPES[widget.widget_type];
  const dataDef = DATA_KEYS[widget.data_key];

  const handleSizeChange = async (newSize) => {
    setBusy(true);
    try { await onUpdate(widget.id, { size: newSize }); } catch (err) { console.error('Update widget failed:', err); } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    setBusy(true);
    try { await onDelete(widget.id); } catch (err) { console.error('Delete widget failed:', err); } finally { setBusy(false); }
  };

  return (
    <div className="we-row">
      <div className="we-row__order">
        <button
          type="button"
          className="we-row__arrow"
          disabled={index === 0 || busy}
          onClick={() => onMove(index, -1)}
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className="we-row__arrow"
          disabled={index === total - 1 || busy}
          onClick={() => onMove(index, 1)}
          aria-label="Move down"
        >
          ↓
        </button>
      </div>

      <div className="we-row__info">
        <span className="we-row__type">{typeDef?.icon ?? '?'} {typeDef?.label ?? widget.widget_type}</span>
        <span className="we-row__title">{widget.title || dataDef?.label || widget.data_key}</span>
      </div>

      <select
        value={widget.size}
        onChange={(e) => handleSizeChange(e.target.value)}
        className="we-row__size"
        disabled={busy}
      >
        {(typeDef?.sizes ?? ['sm', 'md', 'lg']).map((s) => (
          <option key={s} value={s}>{s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}</option>
        ))}
      </select>

      <button type="button" className="we-row__del" onClick={handleDelete} disabled={busy} aria-label="Remove widget">
        ✕
      </button>
    </div>
  );
}

export default function WidgetEditor({ widgets, onAdd, onUpdate, onDelete, onReorder }) {
  const handleMove = async (index, direction) => {
    const items = [...widgets];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    [items[index], items[target]] = [items[target], items[index]];
    const reordered = items.map((w, i) => ({ id: w.id, sort_order: i + 1 }));

    try { await onReorder(reordered); } catch (err) { console.error('Reorder widgets failed:', err); }
  };

  return (
    <div className="we">
      <AddWidgetForm onAdd={onAdd} />

      {widgets.length > 0 && (
        <div className="we-list">
          <h3 className="we-list__title">Current widgets</h3>
          {widgets.map((w, i) => (
            <WidgetRow
              key={w.id}
              widget={w}
              index={i}
              total={widgets.length}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={handleMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
