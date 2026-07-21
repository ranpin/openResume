import React from 'react';
import Icon from './Icon';
import Markdown from './Markdown';

/**
 * 统一模块渲染器：详情弹窗中项目 / 论文 / 实习 / 博客 / 荣誉的只读展示。
 */
const ModuleRenderer = ({ type, data, isDetail = false }) => {
  if (!data) return null;

  const cardClass =
    'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md';
  const detailCardClass =
    'bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6';

  switch (type) {
    case 'news':
      return (
        <div className={`${cardClass} p-5`}>
          <div className="flex items-start space-x-3">
            <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
              {data.date}
            </span>
            <p className="text-gray-800 font-medium leading-relaxed">
              {data.content}
            </p>
          </div>
        </div>
      );

    case 'project':
      return (
        <div className={isDetail ? detailCardClass : `${cardClass} p-6`}>
          <div className="flex justify-between items-start mb-4">
            <h2
              className={`font-bold text-gray-900 ${isDetail ? 'text-3xl' : 'text-xl'}`}
            >
              {data.title}
            </h2>
            {data.period && (
              <span className="text-sm text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                {data.period}
              </span>
            )}
          </div>

          {(data.businessContext || data.yourRole) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {data.businessContext && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                    业务背景
                  </h4>
                  <Markdown className="prose-sm">
                    {data.businessContext}
                  </Markdown>
                </div>
              )}
              {data.yourRole && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                    我的角色
                  </h4>
                  <Markdown className="prose-sm">{data.yourRole}</Markdown>
                </div>
              )}
            </div>
          )}

          {data.architectureDetail && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Icon name="layer-group" className="text-blue-500 mr-2" />
                技术架构详解
              </h3>
              <Markdown className="prose-sm bg-gray-50 p-4 rounded-lg">
                {data.architectureDetail}
              </Markdown>
            </div>
          )}

          {data.technicalChallenges && data.technicalChallenges.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Icon name="bolt" className="text-yellow-500 mr-2" />
                核心技术难点
              </h3>
              <div className="space-y-3">
                {data.technicalChallenges.map((item, idx) => {
                  const isObject = typeof item === 'object' && item !== null;
                  return (
                    <div
                      key={idx}
                      className="border-l-4 border-yellow-400 pl-4 py-2 bg-yellow-50/50 rounded-r-lg"
                    >
                      <p className="font-medium text-gray-800 text-sm">
                        {isObject ? item.challenge : item}
                      </p>
                      {isObject && item.solution && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold text-green-600">
                            方案：
                          </span>
                          {item.solution}
                        </p>
                      )}
                      {isObject && item.impact && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold text-blue-600">
                            效果：
                          </span>
                          {item.impact}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.achievements && data.achievements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Icon name="trophy" className="text-yellow-600 mr-2" />
                主要成果
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                {data.achievements.map((achievement, idx) => (
                  <li key={idx}>{achievement}</li>
                ))}
              </ul>
            </div>
          )}

          {data.results && data.results.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Icon name="chart-bar" className="text-purple-600 mr-2" />
                关键指标
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 text-left font-semibold">
                        指标
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-semibold">
                        数值
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-semibold">
                        基线 / 提升
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((result, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="border border-gray-200 px-4 py-2">
                          {result.metric}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-green-600 font-semibold">
                          {result.value}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-blue-600">
                          {result.baseline || result.improvement}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.discussionTopics && data.discussionTopics.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                <Icon name="comments" className="text-green-600 mr-2" />
                可延伸讨论的话题
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 bg-green-50/50 p-4 rounded-lg">
                {data.discussionTopics.map((topic, idx) => (
                  <li key={idx}>{topic}</li>
                ))}
              </ul>
            </div>
          )}

          {(data.demoImage || data.architectureImage) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {data.demoImage && (
                <div className="rounded-lg overflow-hidden border shadow-sm">
                  <img
                    src={data.demoImage}
                    alt="演示图"
                    loading="lazy"
                    className="w-full h-auto object-cover"
                  />
                  <p className="text-xs text-center text-gray-500 py-2 bg-gray-50">
                    项目演示
                  </p>
                </div>
              )}
              {data.architectureImage && (
                <div className="rounded-lg overflow-hidden border shadow-sm">
                  <img
                    src={data.architectureImage}
                    alt="架构图"
                    loading="lazy"
                    className="w-full h-auto object-cover"
                  />
                  <p className="text-xs text-center text-gray-500 py-2 bg-gray-50">
                    技术架构
                  </p>
                </div>
              )}
            </div>
          )}

          {(data.tags?.length > 0 || data.githubUrl || data.liveUrl) && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {data.tags &&
                data.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              {data.githubUrl && (
                <a
                  href={data.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center"
                >
                  <Icon name="github" className="mr-1" />
                  GitHub
                </a>
              )}
              {data.liveUrl && (
                <a
                  href={data.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-green-600 hover:underline flex items-center"
                >
                  <Icon name="external-link-alt" className="mr-1" />
                  在线演示
                </a>
              )}
            </div>
          )}
        </div>
      );

    case 'internship':
      return (
        <div className={isDetail ? detailCardClass : `${cardClass} p-6`}>
          <div className="flex justify-between items-start mb-4 border-b pb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {data.company}
              </h3>
              <p className="text-blue-600 font-medium mt-1">{data.position}</p>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500 font-mono block">
                {data.period}
              </span>
              <span className="text-xs text-gray-400 block mt-1">
                {data.location}
              </span>
            </div>
          </div>
          {data.description && (
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {data.description}
            </p>
          )}
          {data.achievements && data.achievements.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                主要成果
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {data.achievements.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {data.skills && data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              {data.skills.map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case 'publication':
      return (
        <div className={`${cardClass} p-5`}>
          <h3 className="text-lg font-bold text-blue-700 mb-1">{data.title}</h3>
          <p className="text-sm text-gray-600 mb-1">{data.authors}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500 italic">
              {data.venue}, {data.year}
            </p>
            {data.link && (
              <a
                href={data.link}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-500 hover:underline flex items-center"
              >
                <Icon name="external-link-alt" className="mr-1" />
                链接
              </a>
            )}
          </div>
        </div>
      );

    case 'honor':
      return (
        <div className={`${cardClass} p-5`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{data.award}</h3>
              <p className="text-sm text-gray-600 mt-1">{data.organization}</p>
            </div>
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 text-xs font-bold rounded-full shadow-sm">
              {data.year}
            </span>
          </div>
        </div>
      );

    case 'personal-info':
      return (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur">
              {(data.name || '?')[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{data.name}</h2>
              <p className="text-blue-100">{data.title}</p>
            </div>
          </div>
          {data.bio?.main && (
            <p className="text-sm text-blue-50 leading-relaxed">
              {data.bio.main}
            </p>
          )}
          <div className="mt-3 flex items-center text-xs text-blue-200 space-x-3">
            {data.location && (
              <span className="flex items-center">
                <Icon name="map-marker-alt" className="mr-1" />
                {data.location}
              </span>
            )}
            {data.email && (
              <span className="flex items-center">
                <Icon name="envelope" className="mr-1" />
                {data.email}
              </span>
            )}
          </div>
        </div>
      );

    default:
      return (
        <div className="p-4 text-gray-400 text-center border border-dashed rounded-lg">
          未知模块类型: {type}
        </div>
      );
  }
};

export default ModuleRenderer;
