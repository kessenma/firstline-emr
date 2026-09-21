import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { palette } from '../../../utils/colors';
import {
  privacyPolicy,
  termsOfService,
} from '@fajr/shared/legal-content';
import type { LegalDocument, ContentBlock } from '@fajr/shared/legal-content';

interface TermsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {expanded ? (
          <ChevronUp size={18} color="rgba(255,255,255,0.6)" />
        ) : (
          <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
        )}
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

function renderContentBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case 'paragraph':
      return (
        <Text key={index} style={styles.bodyText}>
          {block.text}
        </Text>
      );
    case 'list':
      return (
        <View key={index}>
          {block.items.map((item, i) => (
            <Text key={i} style={styles.bodyText}>
              {'\u2022'} {item}
            </Text>
          ))}
        </View>
      );
    case 'labeledList':
      return (
        <View key={index}>
          {block.items.map((item, i) => (
            <Text key={i} style={styles.bodyText}>
              {'\u2022'} <Text style={styles.boldText}>{item.bold}</Text> {item.text}
            </Text>
          ))}
        </View>
      );
  }
}

function renderDocument(doc: LegalDocument) {
  return (
    <>
      <Text style={styles.documentTitle}>{doc.title}</Text>
      <Text style={styles.lastUpdated}>Last updated: {doc.lastUpdated}</Text>

      {doc.intro && <Text style={styles.bodyText}>{doc.intro}</Text>}

      {doc.sections.map((section, sectionIndex) => (
        <Section key={sectionIndex} title={section.title}>
          {section.content.map((block, blockIndex) =>
            renderContentBlock(block, blockIndex)
          )}
        </Section>
      ))}
    </>
  );
}

export const TermsDrawer: React.FC<TermsDrawerProps> = ({ isOpen, onClose }) => {
  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Terms & Privacy</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {renderDocument(termsOfService)}

            <View style={styles.divider} />

            {renderDocument(privacyPolicy)}

            <Text style={styles.contactText}>
              Questions? Contact us at {privacyPolicy.contactEmail}
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.teal[400],
    marginTop: 20,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
  },
  section: {
    marginBottom: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  contactText: {
    fontSize: 13,
    color: palette.teal[400],
    textAlign: 'center',
    marginTop: 16,
  },
});
