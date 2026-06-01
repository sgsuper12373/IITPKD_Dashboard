import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import './Page.css';
import './EwdSection.css';
import './NirfRankingSection.css';
import axios from 'axios';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

const NirfRankingSection = ({ user }) => {
    const uploadVersion = useUploadRefresh();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [chartType, setChartType] = useState('bar');
    const [expandedChart, setExpandedChart] = useState(null);

    const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
    useEffect(() => {
        const handle = () => setChartIsMobile(window.innerWidth <= 640);
        window.addEventListener('resize', handle);
        return () => window.removeEventListener('resize', handle);
    }, []);

    const fetchData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/nirf/nirf_metrics`);
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

    const canUpload = user && [3].includes(user.role_id);
    const isGuest = !user || user.role_id === 0;
    const token = localStorage.getItem('authToken');

    if (loading) {
        return (
            <div className="content-card">
                <div className="loading-spinner nirf-spinner-center" />
                <p className="nirf-loading-text">Loading NIRF ranking trends...</p>
            </div>
        );
    }

    if (error) {
        return <div className="content-card error-message">{error}</div>;
    }

    if (data.length === 0) {
        if (canUpload) {
            return (
                <div className="content-card nirf-empty">
                    <h2 className="nirf-empty-h2">NIRF Ranking Overview</h2>
                    <p className="nirf-empty-p">No NIRF ranking data available.</p>
                    <button className="nirf-empty-btn" onClick={() => setIsUploadModalOpen(true)}>
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
        return null;
    }

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

    const rankData = recentData.filter(d => d.rank != null);
    const latestRank = rankData.length > 0 ? rankData[rankData.length - 1].rank : null;
    const firstRank = rankData.length > 0 ? rankData[0].rank : null;
    const rankDelta = (latestRank != null && firstRank != null) ? latestRank - firstRank : null;

    return (
        <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LastUpdated tables={['nirf_ranking']} />
          <ShareButton />
        </div>
        {(!isGuest) && (
        <>
        <div className="content-card">
            <div className="nirf-header">
                <h2 className="nirf-header-h2">NIRF Ranking Overview</h2>
                <div className="nirf-controls">
                    <div className="nirf-mode-row">
                        <button
                            onClick={() => setChartType('bar')}
                            className={`nirf-mode-btn${chartType === 'bar' ? ' nirf-mode-btn--active' : ''}`}
                        >
                            &#128202; Bar
                        </button>
                        <button
                            onClick={() => setChartType('trend')}
                            className={`nirf-mode-btn${chartType === 'trend' ? ' nirf-mode-btn--active' : ''}`}
                        >
                            &#128200; Trend
                        </button>
                    </div>
                    {canUpload && (
                        <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                            Upload Data
                        </button>
                    )}
                </div>
            </div>

            {recentData.length > 0 && (
                <div className="nirf-rank-wrap">
                    <div className="nirf-rank-card">
                        <div className="nirf-rank-stat">
                            <div className="nirf-rank-label">NIRF Engineering Rank (Lower is better)</div>
                            <div className="nirf-rank-years">{recentFirst?.year}&#8211;{recentLatest?.year}</div>
                            <div className="nirf-rank-value">
                                {latestRank != null ? `#${latestRank}` : 'N/A'}
                            </div>
                            <div className="nirf-rank-delta">
                                {rankDelta === null ? null : rankDelta < 0 ? (
                                    <span className="nirf-rank-improved">&#9650; Improved by {Math.abs(rankDelta)} since {recentFirst?.year}</span>
                                ) : rankDelta > 0 ? (
                                    <span className="nirf-rank-dropped">&#9660; Dropped by {rankDelta} since {recentFirst?.year}</span>
                                ) : (
                                    <span className="nirf-rank-unchanged">&#8212; Unchanged since {recentFirst?.year}</span>
                                )}
                            </div>
                            <div className="nirf-rank-badges">
                                {rankData.map(d => (
                                    <div key={d.year} className={`nirf-rank-badge${d.year === recentLatest?.year ? ' nirf-rank-badge--active' : ''}`}>
                                        {d.year}: #{d.rank}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            className={`nirf-rank-chart compact-chart clickable-chart${chartIsMobile ? ' mobile-compact' : ''}`}
                            onClick={() => setExpandedChart({
                                title: "NIRF Engineering Rank Trend",
                                content: (
                                    <ResponsiveContainer width="100%" height={400}>
                                        {chartType === 'bar' ? (
                                            <BarChart data={rankData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="year" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                                                <YAxis domain={[0, 'auto']} tick={{ fontSize: 13, fontWeight: 600 }} tickFormatter={(v) => `#${v}`} />
                                                <Tooltip formatter={(v) => [`#${v}`, 'Rank']} />
                                                <Bar dataKey="rank" fill="#1a237e" radius={[6, 6, 0, 0]}>
                                                    <LabelList dataKey="rank" position="top" formatter={(v) => `#${v}`} style={{ fontSize: '12px', fontWeight: 700, fill: '#1a237e' }} />
                                                </Bar>
                                            </BarChart>
                                        ) : (
                                            <LineChart data={rankData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="year" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                                                <YAxis domain={['auto', 'auto']} reversed={true} tick={{ fontSize: 13, fontWeight: 600 }} tickFormatter={(v) => `#${v}`} />
                                                <Tooltip formatter={(v) => [`#${v}`, 'Rank']} />
                                                <Line type="linear" dataKey="rank" stroke="#1a237e" strokeWidth={4} dot={{ r: 6, fill: '#1a237e' }} />
                                            </LineChart>
                                        )}
                                    </ResponsiveContainer>
                                )
                            })}
                        >
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                {chartType === 'bar' ? (
                                    <BarChart data={rankData} margin={{ top: 26, right: 10, left: 0, bottom: 0 }} barCategoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                        <XAxis dataKey="year" tick={{ fontSize: 10 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 40 : 25} />
                                        <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} tickFormatter={(v) => `#${v}`} hide={chartIsMobile} />
                                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} formatter={(v) => [`#${v}`, 'Rank']} />
                                        <Bar dataKey="rank" fill="#1a237e" radius={[4, 4, 0, 0]} barSize={24}>
                                            <LabelList dataKey="rank" position="top" formatter={(v) => `#${v}`} style={{ fontSize: '11px', fontWeight: 600, fill: '#1a237e' }} />
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <LineChart data={rankData} margin={{ top: 26, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                        <XAxis dataKey="year" tick={{ fontSize: 10 }} padding={{ left: 10, right: 10 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 40 : 25} />
                                        <YAxis domain={['auto', 'auto']} reversed={true} tick={{ fontSize: 10 }} tickFormatter={(v) => `#${v}`} hide={chartIsMobile} />
                                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} formatter={(v) => [`#${v}`, 'Rank']} />
                                        <Line type="linear" dataKey="rank" stroke="#1a237e" strokeWidth={2.5}
                                            dot={{ r: 4, fill: '#1a237e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }}>
                                            <LabelList dataKey="rank" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#1a237e' }} />
                                        </Line>
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {!isGuest && (
                <>
                    <h3 className="nirf-metric-h3">Per-Metric Trend Cards</h3>
                    <div className="nirf-metric-cards">
                        {metrics.map(({ key, label, fullName, color, fill }) => {
                            const latest = Number(recentLatest[key] ?? 0);
                            const first = Number(recentFirst[key] ?? 0);
                            const delta = latest - first;
                            return (
                                <div key={key} className="nirf-metric-card" style={{ border: `1px solid ${fill}` }}>
                                    <div className="nirf-metric-card-header">
                                        <div>
                                            <div className="nirf-metric-label">{label}</div>
                                            <div className="nirf-metric-fullname">{fullName}</div>
                                        </div>
                                        <div className="nirf-metric-right">
                                            <div className="nirf-metric-value" style={{ color }}>{latest}</div>
                                            <div className={`nirf-metric-delta metric-delta ${delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'}`}>
                                                {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {delta !== 0 && Math.abs(delta).toFixed(1)} since {recentFirst?.year}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="compact-chart nirf-metric-chart">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            {chartType === 'bar' ? (
                                                <BarChart data={recentData} margin={{ top: 8, right: 4, left: -32, bottom: 0 }} barCategoryGap="15%">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                                    <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                                                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} />
                                                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} formatter={(v) => [v, label]} />
                                                    <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} barSize={16} />
                                                </BarChart>
                                            ) : (
                                                <LineChart data={recentData} margin={{ top: 8, right: 4, left: -32, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                                    <XAxis dataKey="year" tick={{ fontSize: 9 }} padding={{ left: 10, right: 10 }} />
                                                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} />
                                                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} formatter={(v) => [v, label]} />
                                                    <Line type="linear" dataKey={key} stroke={color} strokeWidth={2}
                                                        dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
                                                </LineChart>
                                            )}
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            <DataUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                tableName="nirf_ranking"
                token={token}
                onUploadSuccess={fetchData}
            />

            <ChartExpandModal
                isOpen={!!expandedChart}
                onClose={() => setExpandedChart(null)}
                title={expandedChart?.title}
            >
                {expandedChart?.content}
            </ChartExpandModal>
        </div>
        </>)}
        </>
    );
};

export default NirfRankingSection;
