import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LegalDocument, ContentBlock } from '@fajr/shared/legal-content';

function renderContentBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p
          key={index}
          className="text-foreground bg-muted p-4 rounded-lg"
        >
          {block.text.split('\n').map((line, i, arr) => (
            <React.Fragment key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    case 'list':
      return (
        <ul
          key={index}
          className="list-disc list-inside text-foreground bg-muted p-4 rounded-lg space-y-1"
        >
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'labeledList':
      return (
        <ul
          key={index}
          className="list-disc list-inside text-foreground bg-muted p-4 rounded-lg space-y-1"
        >
          {block.items.map((item, i) => (
            <li key={i}>
              <strong className="text-primary">{item.bold}</strong> {item.text}
            </li>
          ))}
        </ul>
      );
  }
}

interface LegalDocumentViewProps {
  document: LegalDocument;
}

const LegalDocumentView: React.FC<LegalDocumentViewProps> = ({ document: doc }) => {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto bg-card">
        <CardHeader>
          <CardTitle className="font-aleo text-3xl font-bold text-center text-primary pb-2 border-b-2 border-primary">
            {doc.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
              <p className="text-lg text-muted-foreground text-center italic">
                Last updated: <u>{doc.lastUpdated}</u>
              </p>

              {doc.intro && (
                <p className="text-foreground bg-muted p-4 rounded-lg">
                  {doc.intro}
                </p>
              )}

              {doc.sections.map((section, sectionIndex) => (
                <section key={sectionIndex}>
                  <h3 className="text-xl font-semibold text-primary mb-2 font-aleo">
                    {section.title}
                  </h3>
                  {section.content.map((block, blockIndex) =>
                    renderContentBlock(block, blockIndex)
                  )}
                </section>
              ))}

              <p className="text-muted-foreground text-center bg-muted mt-8 py-2 rounded-lg">
                If you have any questions, please contact us at{' '}
                <a
                  href={`mailto:${doc.contactEmail}`}
                  className="text-primary hover:underline"
                >
                  {doc.contactEmail}
                </a>
                .
              </p>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalDocumentView;
