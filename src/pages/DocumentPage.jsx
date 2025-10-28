import React, { useState } from 'react';
import MarkdownFeedback from '@/components/ui/MarkdownFeedback';
import Layout from '@/components/Layout/Layout';
import OpenAI from 'openai';
import { Button } from '@/components/ui/button';

const DocumentPage = () => {
  const [markdownText, setMarkdownText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sample markdown for initial testing
  const sampleMarkdown = `
# Sample Document

This is a sample document to demonstrate the Markdown preview functionality.

## Section 1

- List item 1
- List item 2
- List item 3

### Subsection 1.1

Here is a paragraph of text. It can contain **bold** text, *italic* text, and \`code\`.

---

## Section 2

This is another section with a table:

| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

> A blockquote for your consideration.
`;

  const handleUpload = async (file) => {
    // This would be your document upload logic
    // For now, we just set the sample markdown
    setMarkdownText(sampleMarkdown);
  };

  const handleApprove = async () => {
    if (!markdownText) return alert('No document loaded.');

    setIsProcessing(true);
    try {
      const openai = new OpenAI({
        apiKey: 'YOUR_OPENAI_API_KEY',
        dangerouslyAllowBrowser: true, // Only for testing; use server in production
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional assistant that converts markdown documents into structured JSON for spending/analytics tracking.',
          },
          {
            role: 'user',
            content: markdownText,
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const jsonResult = response.choices[0].message.content;
      console.log('JSON Result:', jsonResult);

      // TODO: Save JSON to database or user-specific storage
      alert('Document approved and saved successfully!');
    } catch (error) {
      console.error('Error converting markdown to JSON:', error);
      alert('Failed to process document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    setMarkdownText('');
    alert('Document rejected. Please re-upload or edit.');
  };

  return (
    <Layout>
      <div className="p-6 flex flex-col space-y-6">
        <h1 className="text-3xl font-bold">Document / Receipt Preview</h1>

        <div className="flex space-x-4">
          <Button
            className="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={() => handleUpload('sample-file')}
          >
            Scan Receipt
          </Button>
          <Button
            className="bg-purple-500 text-white hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
            onClick={() => handleUpload('sample-file')}
          >
            Scan Document
          </Button>
        </div>

        {markdownText ? (
          <MarkdownFeedback
            markdownText={markdownText}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-lg p-6 border border-gray-300 dark:border-gray-700 rounded-lg">
            No document loaded. Please upload or scan a receipt/document.
          </div>
        )}

        {isProcessing && (
          <p className="text-blue-500 dark:text-blue-400 font-medium">
            Processing document, please wait...
          </p>
        )}
      </div>
    </Layout>
  );
};

export default DocumentPage;
