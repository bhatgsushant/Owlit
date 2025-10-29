import React from 'react';
import { Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownFeedback = ({ markdownText, onApprove, onReject }) => {

  // This component uses a compact, card-style layout with smaller fonts and clear sections.
  return (
    <div className="font-sans bg-[#1A202C] rounded-xl shadow-lg w-full max-w-4xl mx-auto border border-gray-700">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="font-display font-semibold text-lg text-gray-200">
          Document Preview
        </h1>
      </div>

      {/* Content Body */}
      <div className="p-6 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4A5568 #2D3748' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 className="font-display font-semibold text-2xl text-white mb-4 pb-2 border-b border-gray-700" {...props} />,
            h2: ({ node, ...props }) => <h2 className="font-display font-semibold text-xl text-white mt-6 mb-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="font-display font-semibold text-lg text-gray-200 mt-4 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="font-body text-sm text-gray-300 leading-relaxed mb-4" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc list-inside pl-4 space-y-1 font-body text-sm text-gray-300 mb-4" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal list-inside pl-4 space-y-1 font-body text-sm text-gray-300 mb-4" {...props} />,
            li: ({ node, ...props }) => <li className="pl-2" {...props} />,
            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4" {...props} />,
            code: ({ node, inline, ...props }) => (
              <code 
                className={`bg-gray-900 rounded-md font-mono text-xs text-gray-300 ${inline ? 'px-1.5 py-1' : 'block p-3 my-2 overflow-x-auto'}`}
                {...props} 
              />
            ),
            hr: ({ node, ...props }) => <hr className="border-gray-700 my-6" {...props} />,
            table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-gray-700" {...props} /></div>,
            th: ({ node, ...props }) => <th className="border border-gray-600 bg-gray-800 p-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider" {...props} />,
            td: ({ node, ...props }) => <td className="border border-gray-600 p-2 text-sm text-gray-300" {...props} />,
          }}
        >
          {markdownText}
        </ReactMarkdown>
      </div>

      {/* Footer with Action Buttons */}
      <div className="flex justify-end space-x-3 p-4 bg-[#1A202C] border-t border-gray-700 rounded-b-xl">
        <button
          className="bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors hover:bg-gray-600 flex items-center text-sm"
          onClick={onReject}
        >
          <X className="mr-1.5 h-4 w-4" /> Reject
        </button>
        <button
          className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition-colors hover:bg-blue-700 flex items-center text-sm"
          onClick={onApprove}
        >
          <Check className="mr-1.5 h-4 w-4" /> Approve
        </button>
      </div>
    </div>
  );
};

export default MarkdownFeedback;