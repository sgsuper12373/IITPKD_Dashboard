import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ExportMenu = ({
  elementId,
  data,
  headers,
  keys,
  filename = 'export',
  title = '',
  exportType = 'both' // 'chart', 'table', or 'both'
}) => {
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
      // Small delay to ensure the menu is closed before capturing
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
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
        // Handle numbers and escape strings
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

  /*const downloadPDF = () => {
    if (!data || !data.length || !keys || !headers) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    
    if (title) {
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text(title, 40, 40);
    }

    const tableData = data.map(row => keys.map(key => {
      const val = row[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'number') {
        return Number.isInteger(val) ? val.toString() : val.toFixed(2);
      }
      return val.toString();
    }));

    doc.autoTable({
      startY: title ? 60 : 40,
      head: [headers],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, // indigo-600
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 40, right: 40 }
    });

    doc.save(`${filename}.pdf`);
    setIsOpen(false);
  };*/

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 14px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          color: '#475569',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          minWidth: '180px',
          padding: '6px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {(exportType === 'chart' || exportType === 'both') && (
            <button
              onClick={downloadPNG}
              style={menuItemStyle}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ fontSize: '16px' }}>🖼️</span> PNG (Graph)
            </button>
          )}
          {(exportType === 'table' || exportType === 'both') && (
            <>
              {/*<button
                onClick={downloadPDF}
                style={menuItemStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ fontSize: '16px' }}>📄</span> PDF (Data)
              </button>*/}
              <button
                onClick={downloadCSV}
                style={menuItemStyle}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <span style={{ fontSize: '16px' }}>📊</span> CSV (Data)
              </button>
            </>
          )}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const menuItemStyle = {
  width: '100%',
  padding: '10px 12px',
  textAlign: 'left',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
  color: '#334155',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'background-color 0.1s ease'
};

export default ExportMenu;

