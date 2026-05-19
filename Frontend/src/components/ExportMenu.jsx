import { useState, useRef, useEffect } from 'react';
import './ExportMenu.css';

const ExportMenu = ({
  elementId,
  data,
  headers,
  keys,
  filename = 'export',
  exportType = 'both'
}) => {
  const isGuest = !localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('authUser');
  const roleId = storedUser ? JSON.parse(storedUser)?.role_id : undefined;

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const downloadPNG = async () => {
    if (!elementId) return;
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      setIsOpen(false);
      await new Promise(resolve => setTimeout(resolve, 100));
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating PNG', err);
    }
  };

  const downloadCSV = () => {
    if (!data || !data.length || !keys || !headers) return;

    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
      const rowData = keys.map(key => {
        let cellData = row[key] !== undefined && row[key] !== null ? row[key] : '';
        if (typeof cellData === 'string' && (cellData.includes(',') || cellData.includes('"') || cellData.includes('\n'))) {
          cellData = `"${cellData.replace(/"/g, '""')}"`;
        }
        return cellData;
      });
      csvContent += rowData.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  if (isGuest || roleId === 0) return null;

  return (
    <div ref={menuRef} className="em-wrapper">
      <button onClick={() => setIsOpen(!isOpen)} className="em-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="em-dropdown">
          {(exportType === 'chart' || exportType === 'both') && (
            <button onClick={downloadPNG} className="em-item">
              <span className="em-icon">🖼️</span> PNG (Graph)
            </button>
          )}
          {(exportType === 'table' || exportType === 'both') && (
            <button onClick={downloadCSV} className="em-item">
              <span className="em-icon">📊</span> CSV (Data)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
