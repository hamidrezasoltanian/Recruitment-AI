import React from 'react';
import { Candidate } from '../../types';
import { UserIcon, CalendarIcon, BriefcaseIcon, SparklesIcon } from '../ui/Icons';
import { isApiKeySet } from '../../services/aiService';

interface DashboardSummaryProps {
  candidates: Candidate[];
  onOpenAiInsights: () => void;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: string;
    textColor: string;
}

declare const persianDate: any;

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, textColor }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm flex items-center">
        <div className={`p-3 rounded-full mr-4 ${color} ${textColor}`}>
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-sm font-medium text-gray-500">{label}</p>
        </div>
    </div>
);


const DashboardSummary: React.FC<DashboardSummaryProps> = ({ candidates, onOpenAiInsights }) => {
    
    const apiKeySet = isApiKeySet();

    const stats = React.useMemo(() => {
        const activeCandidates = candidates.filter(c => !['hired', 'rejected', 'archived'].includes(c.stage));

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newThisWeek = activeCandidates.filter(c => new Date(c.createdAt) >= oneWeekAgo).length;

        const today = new persianDate();
        const startOfWeek = today.clone().startOf('week');
        const endOfWeek = today.clone().endOf('week');

        const interviewsThisWeek = candidates.filter(c => {
            if (!c.interviewDate) return false;
            try {
                // The date format is YYYY/MM/DD
                const interviewPDate = new persianDate(c.interviewDate.split('/').map(Number));
                return interviewPDate.isBetween(startOfWeek, endOfWeek, 'day', '[]');
            } catch {
                return false;
            }
        }).length;
        
        const offersExtended = candidates.filter(c => c.stage === 'hired').length;
        
        const sourceCounts: { [key: string]: number } = activeCandidates.reduce((acc, c) => {
            acc[c.source] = (acc[c.source] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const sortedSources = Object.entries(sourceCounts)
            .sort(([, a], [, b]) => b - a);

        const topSources = sortedSources.slice(0, 5);
        const otherSourcesCount = sortedSources.slice(5).reduce((sum, [, count]) => sum + count, 0);
        if (otherSourcesCount > 0) {
            topSources.push(['سایر', otherSourcesCount]);
        }
        
        const maxSourceCount = topSources.length > 0 ? Math.max(...topSources.map(([,count]) => count)) : 0;

        return {
            activeCount: activeCandidates.length,
            newThisWeek,
            interviewsThisWeek,
            offersExtended,
            sourceData: topSources.map(([name, count]) => ({
                name,
                count,
                percentage: maxSourceCount > 0 ? (count / maxSourceCount) * 100 : 0
            }))
        };
    }, [candidates]);
    
    if (candidates.length === 0) {
        return null; // Don't show summary if there are no candidates
    }

    return (
        <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard 
                    label="متقاضیان فعال" 
                    value={stats.activeCount} 
                    color="bg-blue-100"
                    textColor="text-blue-600"
                    icon={<UserIcon className="h-6 w-6" />}
                />
                <StatCard 
                    label="جدید در این هفته" 
                    value={stats.newThisWeek} 
                    color="bg-green-100"
                    textColor="text-green-600"
                    icon={<SparklesIcon className="h-6 w-6" />}
                />
                <StatCard 
                    label="مصاحبه‌های این هفته" 
                    value={stats.interviewsThisWeek} 
                    color="bg-amber-100"
                    textColor="text-amber-600"
                    icon={<CalendarIcon className="h-6 w-6" />}
                />
                 <StatCard 
                    label="استخدام شده" 
                    value={stats.offersExtended} 
                    color="bg-[var(--color-primary-100)]"
                    textColor="text-[var(--color-primary-600)]"
                    icon={<BriefcaseIcon className="h-6 w-6" />}
                />
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-800">متقاضیان بر اساس منبع</h3>
                    <button onClick={onOpenAiInsights} disabled={!apiKeySet} title={!apiKeySet ? "ویژگی هوش مصنوعی غیرفعال است. لطفاً کلید API را تنظیم کنید." : "تحلیل داده‌های استخدام با هوش مصنوعی"} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <SparklesIcon className="h-5 w-5" />
                        <span>تحلیل با AI</span>
                    </button>
                </div>
                {stats.sourceData.length > 0 ? (
                    <div className="space-y-3">
                        {stats.sourceData.map(source => (
                            <div key={source.name} className="flex items-center">
                                <p className="w-32 text-sm font-medium text-gray-600 truncate">{source.name}</p>
                                <div className="flex-1 bg-gray-200 rounded-full h-4 ml-4">
                                    <div 
                                        className="bg-[var(--color-primary-500)] h-4 rounded-full" 
                                        style={{ width: `${source.percentage}%` }}
                                    ></div>
                                </div>
                                <p className="w-12 text-left text-sm font-bold text-gray-700">{source.count}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">هنوز داده‌ای برای نمایش وجود ندارد.</p>
                )}
            </div>
        </div>
    );
};

export default DashboardSummary;