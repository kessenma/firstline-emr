export interface ListItemWithLabel {
  bold: string;
  text: string;
}

export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'labeledList'; items: ListItemWithLabel[] };

export interface LegalSection {
  title: string;
  content: ContentBlock[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  contactEmail: string;
}
