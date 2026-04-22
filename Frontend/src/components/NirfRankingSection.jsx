import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Page.css';
import './EwdSection.css'; // Use EWD styles for cards
import axios from 'axios';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import DataUploadModal from './DataUploadModal';

const NirfRankingSection = ({ user }) => {
    const uploadVersion = useUploadRefresh();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/nirf/nirf_metrics`);
            // Ensure data is sorted by year
            const sortedData = response.data.sort((a, b) => a.year - b.year);
            setData(sortedData);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching NIRF data:", err);
            setError("Failed to load NIRF ranking data. Please try again later.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [uploadVersion]);

    const canUpload = user && [2, 3, 4].includes(user.role_id);
    const token = localStorage.getItem('authToken');

    if (loading) {
        return (
            <div className="content-card">
                <div className="loading-spinner" style={{ margin: '2rem auto' }} />
                <p style={{ textAlign: 'center' }}>Loading NIRF ranking trends...</p>
            </div>
        );
    }

    if (error) {
        return <div className="content-card error-message">{error}</div>;
    }

    if (data.length === 0) {
        if (canUpload) {
            return (
                <div className="content-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h2 style={{ marginBottom: '1rem', color: '#1a237e' }}>NIRF Ranking Overview</h2>
                    <p style={{ color: '#666', marginBottom: '2rem' }}>No NIRF ranking data available.</p>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#1a237e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                    >
                        Upload Data
                    </button>

                    <DataUploadModal
                        isOpen={isUploadModalOpen}
                        onClose={() => setIsUploadModalOpen(false)}
                        tableName="nirf_ranking"
                        token={token}
                        onUploadSuccess={fetchData}
                    />
                </div>
            );
        }
        return null; // Don't show anything for regular users if no data
    }

    const latestStats = data[data.length - 1];
    const firstStats = data[0];

    // Limit to the most recent 7 years
    const recentData = data.slice(-7);
    const recentLatest = recentData[recentData.length - 1];
    const recentFirst = recentData[0];

    const metrics = [
        { key: 'tlr', label: 'TLR', fullName: 'Teaching, Learning & Resources', color: '#8884d8', fill: '#ede9fe' },
        { key: 'rpc', label: 'RPC', fullName: 'Research & Professional Practice', color: '#22c55e', fill: '#dcfce7' },
        { key: 'go', label: 'GO', fullName: 'Graduation Outcomes', color: '#f59e0b', fill: '#fef3c7' },
        { key: 'oi', label: 'OI', fullName: 'Outreach & Inclusivity', color: '#f97316', fill: '#ffedd5' },
        { key: 'pr', label: 'PR', fullName: 'Perception', color: '#0ea5e9', fill: '#e0f2fe' },
    ];

    // Rank trend data — filter out years with no rank
    const rankData = recentData.filter(d => d.rank != null);
    const latestRank = rankData.length > 0 ? rankData[rankData.length - 1].rank : null;
    const firstRank = rankData.length > 0 ? rankData[0].rank : null;
    // Negative delta = improved (lower rank number = better)
    const rankDelta = (latestRank != null && firstRank != null) ? latestRank - firstRank : null;

    return (
        <div className="content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, color: '#1a237e' }}>NIRF Ranking Overview</h2>
                {canUpload && (
                    <button
                        className='page-upload-btn'
                        onClick={() => setIsUploadModalOpen(true)}
                    >
                        Upload Data
                    </button>
                )}
            </div>

            {/* ── NIRF Overall Rank Trend ── */}
            {rankData.length > 0 && (
                <>
                    <h3 style={{ fontSize: '1rem', color: '#555', marginBottom: '16px', fontWeight: 600 }}>
                        NIRF Overall Rank Trend
                    </h3>
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            background: '#fff',
                            border: '1px solid #dbeafe',
                            borderRadius: '14px',
                            padding: '20px 24px',
                            boxShadow: '0 2px 12px rgba(30,35,130,0.08)',
                            display: 'flex',
                            gap: '32px',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap'
                        }}>
                            {/* Left: stat summary */}
                            <div style={{ minWidth: '160px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#555', marginBottom: '4px' }}>
                                    Overall NIRF Rank
                                </div>
                                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
                                    Engineering Category · {recentFirst?.year}–{recentLatest?.year}
                                </div>
                                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1a237e', lineHeight: 1 }}>
                                    #{latestRank}
                                </div>
                                <div style={{ fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>
                                    {rankDelta === null ? null : rankDelta < 0 ? (
                                        <span style={{ color: '#22c55e' }}>▲ Improved by {Math.abs(rankDelta)} since {recentFirst?.year}</span>
                                    ) : rankDelta > 0 ? (
                                        <span style={{ color: '#ef4444' }}>▼ Dropped by {rankDelta} since {recentFirst?.year}</span>
                                    ) : (
                                        <span style={{ color: '#888' }}>— Unchanged since {recentFirst?.year}</span>
                                    )}
                                </div>
                                {/* Year badges */}
                                <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {rankData.map(d => (
                                        <div key={d.year} style={{
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            backgroundColor: d.year === recentLatest?.year ? '#1a237e' : '#f1f5f9',
                                            color: d.year === recentLatest?.year ? '#fff' : '#334155',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}>
                                            {d.year}: #{d.rank}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: area chart */}
                            <div style={{ flex: 1, minWidth: '220px', height: 160 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={rankData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="grad-rank" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1a237e" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#1a237e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                                        {/* reversed so lower rank (better) plots higher */}
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            reversed={true}
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(v) => `#${v}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                                            formatter={(v) => [`#${v}`, 'Rank']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="rank"
                                            stroke="#1a237e"
                                            strokeWidth={2.5}
                                            fill="url(#grad-rank)"
                                            dot={{ r: 4, fill: '#1a237e', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Per-Metric Trend Cards (last 7 years) ── */}
            <h3 style={{ fontSize: '1rem', color: '#555', marginBottom: '16px', fontWeight: 600 }}>
                Per-Metric Trend Cards
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {metrics.map(({ key, label, fullName, color, fill }) => {
                    const latest = Number(recentLatest[key] ?? 0);
                    const first = Number(recentFirst[key] ?? 0);
                    const delta = latest - first;
                    return (
                        <div key={key} style={{
                            background: '#fff',
                            border: `1px solid ${fill}`,
                            borderRadius: '14px',
                            padding: '16px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>{label}</div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>{fullName}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '26px', fontWeight: 'bold', color }}>{latest}</div>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: delta >= 0 ? '#22c55e' : '#ef4444'
                                    }}>
                                        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} since {recentFirst?.year}
                                    </div>
                                </div>
                            </div>
                            <div style={{ height: 80 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={recentData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} />
                                        <Tooltip
                                            contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                                            formatter={(v) => [v, label]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey={key}
                                            stroke={color}
                                            strokeWidth={2}
                                            fill={`url(#grad-${key})`}
                                            dot={{ r: 3, fill: color }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>

            <DataUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                tableName="nirf_ranking"
                token={token}
                onUploadSuccess={fetchData}
            />
        </div>
    );
};

export default NirfRankingSection;
