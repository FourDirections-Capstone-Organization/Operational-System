export interface SubTab {
    key: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
}

interface SubTabNavProps {
    tabs: SubTab[];
    activeTab: string;
    onTabChange: (key: string) => void;
    className?: string;
}

export default function SubTabNav({ tabs, activeTab, onTabChange, className = '' }: SubTabNavProps) {
    return (
        <div className={`rm2-subtab-nav ${className}`}>
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    className={`rm2-subtab-btn${activeTab === tab.key ? ' rm2-subtab-btn--active' : ''}`}
                    onClick={() => onTabChange(tab.key)}
                >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="rm2-subtab-badge">{tab.badge}</span>
                    )}
                </button>
            ))}
        </div>
    );
}
