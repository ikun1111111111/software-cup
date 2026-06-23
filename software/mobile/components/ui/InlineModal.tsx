import React from 'react';
import { Modal, Platform, View, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  onClose?: () => void;
  transparent?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  children: React.ReactNode;
}

export default function InlineModal({
  visible,
  onClose,
  transparent = false,
  animationType = 'slide',
  children,
}: Props) {
  if (!visible) return null;

  if (Platform.OS !== 'web') {
    return (
      <Modal
        visible={visible}
        transparent={transparent}
        animationType={animationType}
        presentationStyle={transparent ? 'overFullScreen' : 'pageSheet'}
        onRequestClose={onClose}
      >
        {children}
      </Modal>
    );
  }

  // On web: use React Portal to render at phoneScreen level,
  // escaping overflow:hidden ancestors (card, scroll containers, etc.)
  const portalTarget =
    typeof document !== 'undefined'
      ? document.getElementById('phone-screen-root') ?? document.body
      : null;

  if (!portalTarget) return null;

  return require('react-dom').createPortal(
    <View style={[StyleSheet.absoluteFill, styles.webPortal, !transparent && styles.opaqueBg]}>
      {children}
    </View>,
    portalTarget,
  );
}

const styles = StyleSheet.create({
  webPortal: {
    zIndex: 9999,
  },
  opaqueBg: {
    backgroundColor: '#F7F5F0',
  },
});
