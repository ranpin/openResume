import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { projects, publications, internships } from '../data/content';
import type { ContentItem } from '../types';

interface Recommendation {
  item: ContentItem;
  type: string;
  score: number;
  reason: string;
}

interface SmartRecommendationsProps {
  currentItem: ContentItem | null;
  currentType: string;
  onItemClick: (item: ContentItem, type: string) => void;
}

const COLLECTIONS: { items: ContentItem[]; type: string }[] = [
  { items: projects as ContentItem[], type: 'project' },
  { items: publications as ContentItem[], type: 'publication' },
  { items: internships as ContentItem[], type: 'internship' },
];

const TYPE_INFO: Record<
  string,
  { icon: string; color: string; bg: string; name: string }
> = {
  project: {
    icon: 'code',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    name: '项目',
  },
  publication: {
    icon: 'file-alt',
    color: 'text-green-600',
    bg: 'bg-green-50',
    name: '论文',
  },
  internship: {
    icon: 'briefcase',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    name: '经历',
  },
};

const extractYear = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const m = value.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  currentItem,
  currentType,
  onItemClick,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!currentItem) {
      setRecommendations([]);
      return;
    }

    const cur = currentItem as unknown as Record<string, unknown>;
    const currentTags = Array.isArray(cur.tags) ? (cur.tags as string[]) : [];
    const currentYear = extractYear(cur.period || cur.year || cur.date);
    const currentText = (
      asString(cur.title) +
      ' ' +
      asString(cur.description || cur.abstract || cur.summary)
    ).toLowerCase();
    const keywords = [
      '大模型',
      '端侧',
      'agent',
      'llm',
      '推理',
      '优化',
      '框架',
      '多模态',
      '车机',
      'sdk',
    ];

    const recs: Recommendation[] = [];

    COLLECTIONS.forEach(({ items, type }) => {
      items.forEach((raw) => {
        const item = raw as unknown as Record<string, unknown>;
        if (item.id === currentItem.id && type.includes(currentType)) return;

        let score = 0;
        let commonCount = 0;
        const itemTags = Array.isArray(item.tags)
          ? (item.tags as string[])
          : [];
        if (currentTags.length && itemTags.length) {
          const common = itemTags.filter((t) =>
            currentTags.some(
              (c) =>
                c.toLowerCase().includes(t.toLowerCase()) ||
                t.toLowerCase().includes(c.toLowerCase()),
            ),
          );
          commonCount = common.length;
          score += commonCount * 10;
        }

        const itemYear = extractYear(item.period || item.year || item.date);
        if (currentYear && itemYear && Math.abs(currentYear - itemYear) <= 1) {
          score += 5;
        }

        const itemText = (
          asString(item.title) +
          ' ' +
          asString(item.description || item.abstract || item.summary)
        ).toLowerCase();
        keywords.forEach((k) => {
          if (currentText.includes(k) && itemText.includes(k)) score += 3;
        });

        if (score > 0) {
          const reason =
            commonCount >= 2
              ? '技术栈高度相关'
              : commonCount >= 1
                ? '相关技术领域'
                : score >= 8
                  ? '时间相近'
                  : '可能感兴趣';
          recs.push({ item: raw, type, score, reason });
        }
      });
    });

    setRecommendations(recs.sort((a, b) => b.score - a.score).slice(0, 3));
  }, [currentItem, currentType]);

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-16 border-t pt-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center">
        <Icon name="magic" className="text-purple-500 mr-3" />
        相关推荐
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map(({ item, type, score, reason }, index) => {
          const info = TYPE_INFO[type] || TYPE_INFO.project;
          const data = item as unknown as Record<string, unknown>;
          const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
          return (
            <div
              key={`${type}-${data.id}-${index}`}
              onClick={() => onItemClick(item, type)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-300 group"
            >
              <div className="flex items-start space-x-4 mb-4">
                <div
                  className={`w-12 h-12 ${info.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <Icon name={info.icon} className={`${info.color} text-lg`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`px-2 py-1 ${info.bg} ${info.color} rounded text-xs font-medium`}
                    >
                      {info.name}
                    </span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                      {reason}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm">
                    {asString(data.title || data.position || data.award)}
                  </h4>
                </div>
              </div>

              <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                {asString(data.description || data.abstract || data.summary) ||
                  '暂无描述'}
              </p>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{asString(data.period || data.year || data.date)}</span>
                <div className="flex items-center space-x-1">
                  <Icon name="star" className="text-yellow-400" />
                  <span>
                    匹配度 {Math.min(100, Math.round((score / 20) * 100))}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartRecommendations;
