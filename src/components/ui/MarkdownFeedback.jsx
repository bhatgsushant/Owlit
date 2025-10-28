import React from 'react';
import { Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const MarkdownFeedback = ({ markdownText, onApprove, onReject }) => {
  const truncatedText = markdownText.length > 500
    ? `${markdownText.substring(0, 500)}...`
    : markdownText;

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl rounded-xl dark:bg-gray-900">
      <CardContent className="p-6">
        <div className="relative">
          <div className="overflow-y-auto max-h-[500px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 font-sans text-gray-900 dark:text-gray-100">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-semibold mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-medium mb-1" {...props} />,
                p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                code: ({node, inline, className, children, ...props}) => (
                  <code className={`bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono ${inline ? '' : 'block my-2 p-2'}`} {...props}>
                    {children}
                  </code>
                ),
                table: ({node, ...props}) => (
                  <table className="min-w-full border border-gray-300 dark:border-gray-600 mb-4" {...props} />
                ),
                th: ({node, ...props}) => (
                  <th className="border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 px-3 py-1 text-left" {...props} />
                ),
                td: ({node, ...props}) => (
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-1" {...props} />
                ),
                blockquote: ({node, ...props}) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300 my-2" {...props} />
                ),
              }}
            >
              {truncatedText}
            </ReactMarkdown>
          </div>
          {markdownText.length > 500 && (
            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-gray-50 dark:from-gray-800 pointer-events-none rounded-b-lg"></div>
          )}
        </div>
        {markdownText.length > 500 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            ...preview truncated. Full content will be saved.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
        <Button
          variant="outline"
          className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-400 transform transition duration-200 ease-in-out hover:scale-105"
          onClick={onReject}
        >
          <X className="mr-2 h-4 w-4" /> Reject
        </Button>
        <Button
          className="bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transform transition duration-200 ease-in-out hover:scale-105"
          onClick={onApprove}
        >
          <Check className="mr-2 h-4 w-4" /> Approve & Save
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MarkdownFeedback;
