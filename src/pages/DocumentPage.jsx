import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownFeedback from '@/components/ui/MarkdownFeedback';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const DocumentPage = () => {
  const [originalMarkdown, setOriginalMarkdown] = useState('');
  const [processedMarkdown, setProcessedMarkdown] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const navigate = useNavigate();

  const sampleMarkdown = `
PATIENT INFORMATION
Name: John Appleseed
DOB: 1985-07-22
Address: 123 Health St, Wellness City, 90210

APPOINTMENT DETAILS
Date: 2025-10-28
Doctor: Dr. Emily Carter
Department: Cardiology

DIAGNOSIS
Primary: Hypertension (High Blood Pressure)
Secondary: Hyperlipidemia (High Cholesterol)

MEDICATION PRESCRIBED
1. Lisinopril - 10mg, once daily
2. Atorvastatin - 20mg, once daily

INSTRUCTIONS
- Monitor blood pressure twice daily.
- Follow a low-sodium diet.
- Schedule a follow-up appointment in 3 months.
- Report any side effects, such as dizziness or persistent cough.
`;

  const handleUploadAndProcess = async () => {
    setIsSummarizing(true);
    setProcessedMarkdown('');
    setOriginalMarkdown(sampleMarkdown);

    try {
      const response = await fetch(withApiBase('/api/summarize-markdown'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markdown: sampleMarkdown }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

      const summarizedText = await response.text();
      setProcessedMarkdown(summarizedText);

    } catch (error) {
      console.error('Error summarizing markdown:', error);
      alert('Failed to structure the document. Showing raw text instead.');
      setProcessedMarkdown(sampleMarkdown);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleApprove = () => {
    if (!processedMarkdown) return alert('No document to approve.');

    // Fire the save request to the backend but do not wait for it.
    fetch(withApiBase('/api/process-document'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markdown: processedMarkdown, originalMarkdown: originalMarkdown })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Background save failed:', data.details);
        } else {
            console.log('Document is being saved in the background:', data.id);
            // We can also update localStorage here if needed, as it's fast
            const savedDocuments = JSON.parse(localStorage.getItem('documents') || '[]');
            const newDocument = { ...data, id: new Date().toISOString(), originalMarkdown: processedMarkdown };
            const updatedDocuments = [...savedDocuments, newDocument];
            localStorage.setItem('documents', JSON.stringify(updatedDocuments));
        }
    })
    .catch(error => {
        console.error('Error during background document save:', error);
    });

    // Immediately navigate the user away.
    alert('Approval sent! Your document is being saved in the background.');
    navigate('/scan');
  };

  const handleReject = () => {
    setProcessedMarkdown('');
    setOriginalMarkdown('');
    navigate('/scan'); // Also navigate back on reject
  };

  return (
    <Layout>
      <div className="p-6 flex flex-col items-center space-y-6">
        <div className="w-full max-w-4xl">
            <h1 className="text-3xl font-bold mb-4 text-center">Document Processing</h1>
            
            {!processedMarkdown && !isSummarizing && (
                <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                    <p className="mb-4 text-gray-500 dark:text-gray-400">Click the button to scan a sample document.</p>
                    <Button onClick={handleUploadAndProcess}>
                        Scan Sample Document
                    </Button>
                </div>
            )}

            {(isSummarizing || processedMarkdown) && (
                <div className="w-full mt-4">
                    {isSummarizing ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">AI is structuring your document...</p>
                        </div>
                    ) : (
                        <MarkdownFeedback
                            markdownText={processedMarkdown}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    )}
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default DocumentPage;
